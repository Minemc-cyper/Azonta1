/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║               EduTest Pro — App Logic v2.0                  ║
 * ║   Firebase + LocalStorage Dual-Mode | Full Feature Build    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  🔥 FIREBASE SETUP (ĐỌC ĐỂ CHIA SẺ ĐỀ QUA MẠNG)           │
 * │                                                             │
 * │  1. Vào https://console.firebase.google.com                 │
 * │  2. "Add project" → Đặt tên → Create                       │
 * │  3. Project Settings (⚙️) → "Your apps" → "</>" (Web)      │
 * │  4. Copy firebaseConfig và dán vào FIREBASE_CONFIG bên dưới │
 * │  5. Vào "Build → Realtime Database" → Create database       │
 * │  6. Chọn "Start in test mode" → OK                         │
 * │                                                             │
 * │  Nếu chưa setup, app tự dùng localStorage (chỉ máy GV).   │
 * └─────────────────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════
// 🔥 FIREBASE CONFIG — Thay thế bằng config của bạn ở đây
// ═══════════════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDjswXUCLUn7hPlBl8J8zfRRCi0uT9QQas",
    authDomain: "web-banhbao.firebaseapp.com",
    databaseURL: "https://web-banhbao-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "web-banhbao",
    storageBucket: "web-banhbao.firebasestorage.app",
    messagingSenderId: "351615398917",
    appId: "1:351615398917:web:689279c17e848e0077186c",
    measurementId: "G-BBGF857ZET"
};

// Tự động phát hiện xem Firebase đã được cấu hình chưa
const IS_FIREBASE_CONFIGURED = !FIREBASE_CONFIG.apiKey.includes('YOUR_');

// Firebase DB reference (null nếu chưa cấu hình)
let firebaseDb = null;

if (IS_FIREBASE_CONFIGURED) {
    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        firebaseDb = firebase.database();
        console.log('✅ Firebase connected — Cloud mode active');
    } catch (e) {
        console.warn('⚠️ Firebase init failed, falling back to localStorage:', e.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// 🤖 VERCEL AI BACKEND CONFIG
// Dùng Serverless API nội bộ để hoàn toàn ẩn API Key khỏi mã nguồn Frontend
// ═══════════════════════════════════════════════════════════════
const IS_AI_CONFIGURED = true; // Luôn mở vì đã cấu hình trên máy chủ

// ═══════════════════════════════════════════════════════════════
// 🆔 DEVICE ID — Dùng để nhận diện "đề của tôi" mà không cần login
// ═══════════════════════════════════════════════════════════════
const DEVICE_ID = localStorage.getItem('edutest_device_id') || (() => {
    const id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    localStorage.setItem('edutest_device_id', id);
    return id;
})();

// ═══════════════════════════════════════════════════════════════
// 🗂️ LOCAL STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════
const LocalDB = {
    getAll() {
        return JSON.parse(localStorage.getItem('edutest_db') || '{"tests":[]}');
    },
    save(db) {
        localStorage.setItem('edutest_db', JSON.stringify(db));
    },
    getMyTestCodes() {
        return JSON.parse(localStorage.getItem('my_test_codes') || '[]');
    },
    addMyTestCode(code) {
        const codes = this.getMyTestCodes();
        if (!codes.includes(code)) codes.unshift(code);
        localStorage.setItem('my_test_codes', JSON.stringify(codes));
    },
    removeMyTestCode(code) {
        const codes = this.getMyTestCodes().filter(c => c !== code);
        localStorage.setItem('my_test_codes', JSON.stringify(codes));
    },
    getTest(code) {
        return this.getAll().tests.find(t => t.code === code) || null;
    },
    saveTest(testConfig) {
        const db = this.getAll();
        const idx = db.tests.findIndex(t => t.code === testConfig.code);
        if (idx > -1) db.tests[idx] = testConfig;
        else db.tests.push(testConfig);
        this.save(db);
        this.addMyTestCode(testConfig.code);
    },
    deleteTest(code) {
        const db = this.getAll();
        db.tests = db.tests.filter(t => t.code !== code);
        this.save(db);
        this.removeMyTestCode(code);
    },
    saveResult(code, result) {
        const db = this.getAll();
        const test = db.tests.find(t => t.code === code);
        if (test) {
            if (!test.results) test.results = [];
            test.results.push(result);
            this.save(db);
        }
    },
    getResults(code) {
        const test = this.getTest(code);
        return test?.results || [];
    },
    // ── Session tracking (for monitor) ──
    saveSession(code, sessionId, data) {
        const key = `sess_${code}`;
        const sessions = JSON.parse(localStorage.getItem(key) || '{}');
        sessions[sessionId] = data;
        localStorage.setItem(key, JSON.stringify(sessions));
    },
    updateSession(code, sessionId, update) {
        const key = `sess_${code}`;
        const sessions = JSON.parse(localStorage.getItem(key) || '{}');
        if (sessions[sessionId]) Object.assign(sessions[sessionId], update);
        localStorage.setItem(key, JSON.stringify(sessions));
    },
    getSessions(code) {
        const key = `sess_${code}`;
        return Object.values(JSON.parse(localStorage.getItem(key) || '{}'));
    },
    // ── Exam controls (answers open, room lock) ──
    setControl(code, key, value) {
        const ctrlKey = `ctrl_${code}`;
        const ctrl = JSON.parse(localStorage.getItem(ctrlKey) || '{}');
        ctrl[key] = value;
        localStorage.setItem(ctrlKey, JSON.stringify(ctrl));
    },
    getControl(code, key) {
        const ctrlKey = `ctrl_${code}`;
        return (JSON.parse(localStorage.getItem(ctrlKey) || '{}'))[key];
    }
};

// ═══════════════════════════════════════════════════════════════
// 🔧 FIREBASE HELPERS
// ═══════════════════════════════════════════════════════════════
const CloudDB = {
    // Hàm bọc chống treo vĩnh viễn (Nới hạn mức lên 5 giây để Điện thoại 4G đọc kịp Data)
    async withTimeout(promise, ms = 5000, errorMsg = 'Mạng chậm/chặn kết nối Firebase (Offline Mode)') {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms));
        return Promise.race([promise, timeout]);
    },
    async saveTest(testConfig) {
        if (!firebaseDb) return false;
        await this.withTimeout(firebaseDb.ref(`tests/${testConfig.code}`).set(testConfig));
        return true;
    },
    async getTest(code) {
        if (!firebaseDb) return null;
        const snap = await this.withTimeout(firebaseDb.ref(`tests/${code}`).once('value'));
        return snap.val();
    },
    async saveResult(code, result) {
        if (!firebaseDb) return false;
        await this.withTimeout(firebaseDb.ref(`results/${code}`).push(result));
        return true;
    },
    async getResults(code) {
        if (!firebaseDb) return [];
        const snap = await this.withTimeout(firebaseDb.ref(`results/${code}`).once('value'));
        const val = snap.val();
        if (!val) return [];
        return Object.values(val);
    },
    async deleteTest(code) {
        if (!firebaseDb) return false;
        await this.withTimeout(firebaseDb.ref(`tests/${code}`).remove());
        await this.withTimeout(firebaseDb.ref(`results/${code}`).remove());
        return true;
    }
};

// ═══════════════════════════════════════════════════════════════
// 🎮 MAIN APP OBJECT
// ═══════════════════════════════════════════════════════════════
const app = {

    // ── State ──
    currentQuestions: [],
    activeExam: null,
    viewingTestCode: null,
    studentName: '',
    answers: {},
    timerInterval: null,
    timeRemaining: 0,
    // Monitor & session state
    sessionId: null,
    monitoringCode: null,
    monitorInterval: null,
    answerCheckInterval: null,

    // ══════════════════════════════
    // INIT
    // ══════════════════════════════
    init() {
        // Show offline banner if Firebase not configured
        if (!IS_FIREBASE_CONFIGURED) {
            document.getElementById('firebase-banner').classList.remove('hidden');
        }
        // Set up drag & drop on upload zones
        app._setupDropZones();
        // Render home
        app.navigate('home-screen');
    },

    _setupDropZones() {
        const zones = [
            { zoneId: 'word-drop-zone', inputId: 'word-file-input', handler: 'handleWordFile' },
            { zoneId: 'img-drop-zone', inputId: 'img-file-input', handler: 'handleImageFile' }
        ];
        zones.forEach(({ zoneId, handler }) => {
            const zone = document.getElementById(zoneId);
            if (!zone) return;
            zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
            zone.addEventListener('drop', e => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) app[handler]({ target: { files: [file] } });
            });
        });
    },

    // ══════════════════════════════
    // NAVIGATION
    // ══════════════════════════════
    navigate(sectionId) {
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');

        // Update header nav
        app._renderHeaderNav(sectionId);

        // Hooks
        if (sectionId === 'home-screen') app.resetExamState();
        if (sectionId === 'teacher-my-tests') app.renderMyTests();
        if (sectionId === 'teacher-monitor') app.loadMonitorData();
        // Clean up monitor when leaving
        if (sectionId !== 'teacher-monitor') {
            if (app.monitorInterval) { clearInterval(app.monitorInterval); app.monitorInterval = null; }
            if (IS_FIREBASE_CONFIGURED && firebaseDb && app.monitoringCode) {
                firebaseDb.ref(`sessions/${app.monitoringCode}`).off();
                firebaseDb.ref(`exam-controls/${app.monitoringCode}`).off();
            }
        }
        // Clean up answer check when leaving result
        if (sectionId !== 'result-screen') {
            if (app.answerCheckInterval) { clearInterval(app.answerCheckInterval); app.answerCheckInterval = null; }
            if (IS_FIREBASE_CONFIGURED && firebaseDb && app.activeExam) {
                firebaseDb.ref(`exam-controls/${app.activeExam.code}/answersOpen`).off();
            }
        }
    },

    _renderHeaderNav(activeSectionId) {
        const nav = document.getElementById('header-nav');
        const teacherSections = ['teacher-dashboard', 'teacher-review', 'teacher-my-tests', 'teacher-results-detail', 'teacher-monitor'];
        const studentSections = ['student-login', 'student-exam', 'result-screen'];

        if (teacherSections.includes(activeSectionId)) {
            nav.innerHTML = `
                <button class="nav-btn" onclick="app.navigate('teacher-dashboard')"><i class="fa-solid fa-plus"></i> Tạo đề</button>
                <button class="nav-btn" onclick="app.navigate('teacher-my-tests')"><i class="fa-solid fa-folder-open"></i> Đề của tôi</button>
                <button class="nav-btn" onclick="app.navigate('home-screen')"><i class="fa-solid fa-house"></i></button>
            `;
        } else if (studentSections.includes(activeSectionId)) {
            nav.innerHTML = `
                <button class="nav-btn" onclick="app.navigate('home-screen')"><i class="fa-solid fa-house"></i> Trang chủ</button>
            `;
        } else {
            nav.innerHTML = '';
        }
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        const btn = document.querySelector(`.tab-btn[onclick="app.switchTab('${tabId}')"]`);
        if (btn) btn.classList.add('active');
        const panel = document.getElementById(tabId);
        if (panel) panel.classList.add('active');
    },

    // ══════════════════════════════
    // TEXT PARSING (REGEX ENGINE)
    // ══════════════════════════════
    parseText(text) {
        if (!text.trim()) {
            app.showToast('error', 'Vui lòng dán nội dung vào ô văn bản!');
            return;
        }

        text = text.replace(/&nbsp;/gi, ' ');

        // Tách A. B. C. D. xuống dòng riêng
        text = text.replace(/([A-D])[\.)](?:\s|\u00A0|&nbsp;)*/gi, function (match, p1, offset, fullString) {
            const prevChar = fullString[offset - 1];
            if (!prevChar || /[\s>;​\u00A0\t\n\r]/.test(prevChar)) {
                return '\n' + p1.toUpperCase() + '. ';
            }
            return match;
        });

        // Chuẩn hóa dòng đáp án
        text = text.replace(/(\s|^)(Đáp án|Kết quả|Đ\.án)[:\s]*([A-D])/gi, '\nĐáp án: $3');

        const lines = text.split('\n').filter(l => l.trim() !== '');
        const questions = [];
        let currentQ = null;

        for (let rawLine of lines) {
            rawLine = rawLine.trim();
            const origLine = rawLine;

            // Xóa HTML tags rỗng
            let tempLine = origLine;
            let lastLine = '';
            while (tempLine !== lastLine) {
                lastLine = tempLine;
                tempLine = tempLine.replace(/<(u|b|strong|em|span)[^>]*>(?:\s|&nbsp;)*<\/\1>/gi, '');
            }

            // Phát hiện đáp án đúng có đánh dấu
            let isMarkedCorrect = false;
            if (tempLine.match(/<\/?(u|b|strong|em|span)[^>]*>/i)) isMarkedCorrect = true;
            if (tempLine.match(/[\(\[]Đ(?:úng)?[\)\]]/i)) isMarkedCorrect = true;

            // Làm sạch line
            let line = origLine.replace(/<\/?(?:u|b|strong|em|span|div)[^>]*>/gi, '').trim();
            line = line.replace(/\s*[\(\[](Đ(?:úng)?|S(?:ai)?)[\)\]]/gi, '');

            // Câu hỏi mới
            if (line.match(/^(Câu|Câu hỏi)\s*\d+[\.:]/i)) {
                if (currentQ && currentQ.options.length > 0) {
                    // Nếu không có dòng 'Đáp án: X' mà chỉ dùng đánh dấu, và có ĐÚNG 1 đáp án được đánh dấu thì mới nhận
                    if (currentQ.correctAnswerIndex === -1 && currentQ.markedOptionsCount === 1) {
                        currentQ.correctAnswerIndex = currentQ.detectedMarkIndex;
                    }
                    questions.push(currentQ);
                }
                currentQ = {
                    id: 'q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
                    text: line.replace(/^(Câu|Câu hỏi)\s*\d+[\.:\s]+/i, ''),
                    options: [],
                    correctAnswerIndex: -1,
                    markedOptionsCount: 0,
                    detectedMarkIndex: -1
                };
            }
            // Đáp án A/B/C/D
            else if (line.match(/^[A-D][\.)]\s/i) && currentQ) {
                const optText = line.replace(/^[A-D][\.)]\s*/i, '');
                currentQ.options.push({
                    id: 'opt_' + Math.random().toString(36).slice(2, 8),
                    text: optText
                });
                if (isMarkedCorrect) {
                    currentQ.markedOptionsCount++;
                    currentQ.detectedMarkIndex = currentQ.options.length - 1;
                }
            }
            // Dòng "Đáp án: A"
            else if (line.match(/^(Đáp án|Kết quả|Đ\.án)[:\s]*([A-D])/i) && currentQ) {
                const match = line.match(/([A-D])/i);
                if (match) {
                    const charToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                    currentQ.correctAnswerIndex = charToIndex[match[0].toUpperCase()];
                }
            }
            // Tiếp tục nội dung câu hỏi (nếu chưa có đáp án)
            else if (currentQ && currentQ.options.length === 0 && line.length > 0) {
                currentQ.text += ' ' + line;
            }
        }
        if (currentQ && currentQ.options.length > 0) {
            if (currentQ.correctAnswerIndex === -1 && currentQ.markedOptionsCount === 1) {
                currentQ.correctAnswerIndex = currentQ.detectedMarkIndex;
            }
            questions.push(currentQ);
        }

        if (questions.length === 0) {
            Swal.fire({
                title: 'Không nhận diện được câu hỏi',
                html: `Kiểm tra lại định dạng:<br><br>
                <code style="text-align:left;display:block;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-size:0.85rem;line-height:1.8">
                Câu 1: Nội dung câu hỏi?<br>
                A. Đáp án A<br>B. Đáp án B<br>C. Đáp án C<br>D. Đáp án D<br>
                Đáp án: A</code>`,
                icon: 'warning',
                background: '#1e1b4b',
                color: '#f1f5f9'
            });
            return;
        }

        app.currentQuestions = questions;
        app.renderReviewScreen();
        app.navigate('teacher-review');
        app.showToast('success', `Nhận diện được ${questions.length} câu hỏi!`);
    },

    // ══════════════════════════════
    // FILE UPLOADS
    // ══════════════════════════════
    handleWordFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const loadBtn = document.getElementById('btn-parse-text');
        app.showToast('info', 'Đang đọc file Word...');

        const reader = new FileReader();
        reader.onload = function (loadEvent) {
            const arrayBuffer = loadEvent.target.result;
            const options = {
                styleMap: [
                    "u => u", "b => b", "strong => strong",
                    "r[color='FF0000'] => span.red",
                    "r[color='C00000'] => span.red",
                    "r[color='red'] => span.red"
                ]
            };
            mammoth.convertToHtml({ arrayBuffer }, options)
                .then(result => {
                    let html = result.value;
                    let text = html
                        .replace(/<\/p>/gi, '\n')
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<p[^>]*>/gi, '');
                    document.getElementById('raw-text-input').value = text;
                    app.switchTab('text-upload');
                    app.showToast('success', 'Đã đọc xong file Word! Kiểm tra văn bản rồi nhấn "Nhận diện".');
                })
                .catch(err => {
                    console.error('Mammoth Error:', err);
                    Swal.fire({
                        title: 'Lỗi đọc file Word',
                        html: `Chỉ hỗ trợ file <b>.docx</b> (Word mới), không hỗ trợ <b>.doc</b> cũ.<br><small style="color:var(--danger)">${err.message || 'File bị hỏng hoặc không đúng chuẩn'}</small>`,
                        icon: 'error', background: '#1e1b4b', color: '#f1f5f9'
                    });
                });
        };
        reader.readAsArrayBuffer(file);
    },

    handleImageFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        document.getElementById('ocr-loader').classList.remove('hidden');

        Tesseract.recognize(file, 'vie', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    document.querySelector('.loader-status').textContent =
                        `Đang quét ảnh... ${Math.round(m.progress * 100)}%`;
                }
            }
        }).then(({ data: { text } }) => {
            document.getElementById('ocr-loader').classList.add('hidden');
            document.getElementById('raw-text-input').value = text;
            app.switchTab('text-upload');
            app.showToast('info', 'Quét xong! Hãy kiểm tra lại văn bản trước khi nhận diện.');
        }).catch(() => {
            document.getElementById('ocr-loader').classList.add('hidden');
            app.showToast('error', 'Không thể đọc chữ từ ảnh. Hãy thử ảnh rõ hơn.');
        });
    },

    // ══════════════════════════════
    // TEACHER REVIEW SCREEN
    // ══════════════════════════════
    renderReviewScreen() {
        document.getElementById('parsed-count').textContent = app.currentQuestions.length;
        const listDiv = document.getElementById('parsed-questions-list');
        listDiv.innerHTML = '';

        // Show/hide AI suggest button
        const unansweredCount = app.currentQuestions.filter(q => q.correctAnswerIndex === -1).length;
        const btnAI = document.getElementById('btn-ai-suggest');
        const aiNotice = document.getElementById('ai-key-notice');
        if (unansweredCount > 0 && app.currentQuestions.length > 0) {
            if (IS_AI_CONFIGURED) {
                btnAI.style.display = 'inline-flex';
                btnAI.textContent = '';
                btnAI.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> AI đề xuất ${unansweredCount} đáp án còn thiếu`;
                if (aiNotice) aiNotice.classList.add('hidden');
            } else {
                btnAI.style.display = 'none';
                if (aiNotice) aiNotice.classList.remove('hidden');
            }
        } else {
            if (btnAI) btnAI.style.display = 'none';
            if (aiNotice) aiNotice.classList.add('hidden');
        }

        app.currentQuestions.forEach((q, idx) => {
            const letters = ['A', 'B', 'C', 'D'];
            const optsHtml = q.options.map((opt, oIdx) => {
                const isCorrect = oIdx === q.correctAnswerIndex;
                const isAiHint = isCorrect && q.isAiSuggested;
                return `<div class="q-opt ${isCorrect ? 'correct' : ''} ${isAiHint ? 'ai-suggested' : ''}"
                    onclick="app.setCorrectAnswer(${idx}, ${oIdx})"
                    title="Nhấp để chọn làm đáp án đúng"
                    role="button" tabindex="0">
                    <b>${letters[oIdx]}.</b> ${opt.text}
                </div>`;
            }).join('');

            const missingWarning = q.correctAnswerIndex === -1
                ? `<p style="color:var(--danger);font-size:0.8rem;margin-top:10px;"><i class="fa-solid fa-triangle-exclamation"></i> Chưa có đáp án! Nhấp vào một đáp án ở trên để chọn.</p>`
                : '';

            listDiv.innerHTML += `
                <div class="q-card">
                    <div class="q-title">Câu ${idx + 1}: ${q.text}</div>
                    <div class="q-options">${optsHtml}</div>
                    ${missingWarning}
                </div>
            `;
        });
    },

    setCorrectAnswer(qIndex, oIndex) {
        app.currentQuestions[qIndex].correctAnswerIndex = oIndex;
        app.currentQuestions[qIndex].isAiSuggested = false; // manual override clears AI flag
        app.renderReviewScreen();
    },

    // ══════════════════════════════
    // 🤖 AI ANSWER SUGGESTION
    // ══════════════════════════════
    async suggestAnswersWithGemini() {
        const unanswered = app.currentQuestions.filter(q => q.correctAnswerIndex === -1);
        if (unanswered.length === 0) {
            app.showToast('info', 'Tất cả câu hỏi đã có đáp án!');
            return;
        }

        const btn = document.getElementById('btn-ai-suggest');
        const origHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;margin:0;border-width:2px"></div> AI đang suy nghĩ...';

        const letters = ['A', 'B', 'C', 'D'];
        let filled = 0;
        let hasError = false;
        const CHUNK_SIZE = 5; // Chia cực nhỏ 5 câu/lần để đảm bảo không dính 413 của Groq

        try {
            // Hàm làm sạch văn bản, gọt bỏ sạch sẽ mọi thẻ Ảnh (base64 khổng lồ) và Mã HTML
            const cleanText = (html) => {
                if (!html) return '';
                // Xóa thẻ img
                let text = html.replace(/<img[^>]*>/g, '[Hình ảnh]');
                // Xóa các thẻ HTML khác
                text = text.replace(/<[^>]+>/g, '');
                return text.trim();
            };

            for (let i = 0; i < unanswered.length; i += CHUNK_SIZE) {
                const chunk = unanswered.slice(i, i + CHUNK_SIZE);
                const questionsText = chunk.map((q, idx) => {
                    const cleanQText = cleanText(q.text);
                    const opts = q.options.map((o, j) => `${letters[j]}. ${cleanText(o.text)}`).join('\n');
                    return `Câu số ${idx + 1}: ${cleanQText}\n${opts}`;
                }).join('\n\n');

                const prompt = `Bạn là hệ thống trắc nghiệm. Nhiệm vụ: Tìm đáp án ĐÚNG (mã hóa: 0=A, 1=B, 2=C, 3=D) cho các câu hỏi sau. 
CHÚ Ý QUAN TRỌNG:
- Có ${chunk.length} câu hỏi. Bạn BẮT BUỘC phải trả về mảng chứa CHÍNH XÁC ${chunk.length} con số. Không bỏ sót câu nào!
- Kết quả PHẢI là chuỗi JSON hợp lệ, ví dụ với 3 câu: {"answers": [1, 0, 3]}

Danh sách câu hỏi:
${questionsText}`;

                let retryCount = 0;
                let chunkSuccess = false;

                while (retryCount < 2 && !chunkSuccess) {
                    try {
                        const res = await fetch('/api/suggest', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                prompt: prompt
                            })
                        });

                        if (res.status === 413) throw new Error('Đề thi quá dài (Lỗi 413).');
                        if (res.status === 429) throw new Error('API quá tải (429).');
                        if (!res.ok) {
                            const errorData = await res.json().catch(() => ({}));
                            throw new Error(errorData.error || `HTTP ${res.status}`);
                        }

                        const data = await res.json();
                        const rawText = data?.choices?.[0]?.message?.content || '';
                        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                        if (!jsonMatch) throw new Error('JSON lỗi');

                        const parsed = JSON.parse(jsonMatch[0]);
                        const answers = parsed.answers;

                        if (Array.isArray(answers)) {
                            chunk.forEach((q, idx) => {
                                if (idx < answers.length) {
                                    const oIdx = parseInt(answers[idx]);
                                    if (!isNaN(oIdx) && oIdx >= 0 && oIdx < q.options.length) {
                                        q.correctAnswerIndex = oIdx;
                                        q.isAiSuggested = true;
                                        filled++;
                                    }
                                }
                            });
                        }
                        chunkSuccess = true; // mapped successfully
                    } catch (e) {
                        retryCount++;
                        if (e.message.includes('413') || e.message.includes('429')) throw e; // Ném lỗi văng hẳn ra ngoài nếu dính quota
                        if (retryCount >= 2) console.warn("Skip chunk due to errors", e);
                    }
                }
            }

            app.renderReviewScreen();
            app.showToast('success', `🤖 AI đề xuất thành công ${filled}/${unanswered.length} đáp án!`);

        } catch (err) {
            console.error('Groq error:', err);
            app.showToast('error', `AI gặp lỗi: ${err.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    },

    // ══════════════════════════════
    // SAVE TEST
    // ══════════════════════════════
    async saveTest() {
        const missingAnswer = app.currentQuestions.find(q => q.correctAnswerIndex === -1);
        if (missingAnswer) {
            app.showToast('error', 'Còn câu hỏi chưa có đáp án! Hãy nhấp vào đáp án đúng cho mỗi câu.');
            return;
        }
        if (app.currentQuestions.length === 0) {
            app.showToast('error', 'Không có câu hỏi nào để lưu!');
            return;
        }

        const name = document.getElementById('test-name').value.trim()
            || `Bài kiểm tra ${new Date().toLocaleDateString('vi-VN')}`;
        const time = parseInt(document.getElementById('test-time').value) || 0;
        const shuffle = document.getElementById('shuffle-questions').checked;
        const allowViewAnswers = document.getElementById('allow-view-answers').checked;

        const teacherControlledAnswers = document.getElementById('teacher-controlled-answers').checked;
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const testConfig = {
            code,
            name,
            timeLimit: time,
            shuffleSettings: shuffle,
            allowViewAnswers,
            teacherControlledAnswers,
            questions: app.currentQuestions,
            creatorDeviceId: DEVICE_ID,
            createdAt: Date.now(),
            isCloud: false
        };

        const btn = document.getElementById('btn-save-test');
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;margin:0;border-width:2px"></div> Đang lưu...';

        // Init exam controls defaults
        LocalDB.setControl(code, 'answersOpen', false);
        LocalDB.setControl(code, 'examLocked', false);
        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            // Không await để tránh treo UI nếu Firebase mất mạng
            firebaseDb.ref(`exam-controls/${code}`).set({ answersOpen: false, examLocked: false }).catch(e => console.warn(e));
        }

        // Save locally (always)
        LocalDB.saveTest(testConfig);

        // Save to cloud if Firebase configured
        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            try {
                testConfig.isCloud = true;
                await CloudDB.saveTest(testConfig);

                LocalDB.saveTest(testConfig); // update with isCloud = true
                app.showToast('success', '☁️ Đề thi đã lưu lên mạng thành công!');
            } catch (e) {
                console.warn('Cloud save failed, kept local:', e);
                app.showToast('warning', `Lưu lên mạng thất bại (${e.message}), đã lưu offline.`);
            }
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Lưu & Tạo mã đề thi';

        Swal.fire({
            title: '🎉 Tạo đề thành công!',
            html: `
                <p style="margin-bottom:12px">Mã bài thi của bạn:</p>
                <div style="font-size:2.4rem;font-weight:900;letter-spacing:8px;color:#6366f1;font-family:monospace;cursor:pointer;padding:16px;background:rgba(99,102,241,0.1);border-radius:12px;border:1px solid rgba(99,102,241,0.3)" onclick="navigator.clipboard.writeText('${code}');this.textContent='✅ Đã copy!'">
                    ${code}
                </div>
                <p style="margin-top:14px;font-size:0.85rem;color:#94a3b8">Nhấp vào mã để copy. Gửi mã này cho học sinh.</p>
                ${IS_FIREBASE_CONFIGURED ? '<p style="color:#10b981;font-size:0.85rem;margin-top:8px"><i class="fa-solid fa-cloud"></i> Học sinh trên các thiết bị khác đều có thể dùng mã này.</p>' : '<p style="color:#f59e0b;font-size:0.85rem;margin-top:8px"><i class="fa-solid fa-triangle-exclamation"></i> Chế độ offline: Học sinh phải làm bài trên máy này.</p>'}
            `,
            icon: 'success',
            background: '#1a0f3a',
            color: '#f1f5f9',
            confirmButtonColor: '#6366f1',
            confirmButtonText: 'Xong!'
        }).then(() => {
            app.navigate('teacher-my-tests');
        });
    },

    // ══════════════════════════════
    // MY TESTS SCREEN
    // ══════════════════════════════
    async renderMyTests() {
        const container = document.getElementById('my-tests-list');
        container.innerHTML = `<div class="empty-state"><div class="spinner"></div><p>Đang tải đề thi...</p></div>`;

        const codes = LocalDB.getMyTestCodes();

        if (codes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-folder-open"></i>
                    <p>Bạn chưa tạo đề nào trên thiết bị này.<br>
                    <a href="#" onclick="app.navigate('teacher-dashboard')" style="color:var(--primary)">Tạo đề ngay!</a></p>
                </div>`;
            return;
        }

        // Load tests (from cloud if available, else from local)
        const tests = await Promise.all(codes.map(async code => {
            let test = null;
            if (IS_FIREBASE_CONFIGURED && firebaseDb) {
                try { test = await CloudDB.getTest(code); } catch (e) { }
            }
            if (!test) test = LocalDB.getTest(code);
            return test;
        }));

        // Load result counts
        const resultCounts = await Promise.all(codes.map(async code => {
            let results = [];
            if (IS_FIREBASE_CONFIGURED && firebaseDb) {
                try { results = await CloudDB.getResults(code); } catch (e) { }
            }
            if (results.length === 0) results = LocalDB.getResults(code);
            return results.length;
        }));

        container.innerHTML = '';
        tests.forEach((test, i) => {
            if (!test) return;
            const count = resultCounts[i];
            const isCloud = test.isCloud && IS_FIREBASE_CONFIGURED;
            const createdDate = test.createdAt
                ? new Date(test.createdAt).toLocaleDateString('vi-VN')
                : 'N/A';

            container.innerHTML += `
                <div class="test-card" id="card-${test.code}">
                    <div class="test-card-top">
                        <div class="test-card-name">${test.name}</div>
                        <div class="test-card-code" onclick="app.copyCode('${test.code}')" title="Nhấp để copy mã">${test.code}</div>
                    </div>
                    <div class="test-card-meta">
                        <span><i class="fa-solid fa-list-ol"></i> ${test.questions.length} câu</span>
                        <span><i class="fa-regular fa-clock"></i> ${test.timeLimit ? test.timeLimit + ' phút' : 'Tự do'}</span>
                        <span><i class="fa-regular fa-calendar"></i> ${createdDate}</span>
                        <span class="${isCloud ? 'cloud-badge' : 'local-badge'}">${isCloud ? '☁️ Cloud' : '💾 Local'}</span>
                    </div>
                    <div class="test-card-submissions">
                        <div>
                            <div class="sub-count">${count}</div>
                            <div class="sub-label">lượt nộp bài</div>
                        </div>
                        <button class="btn btn-outline" onclick="app.viewTestResults('${test.code}')">
                            <i class="fa-solid fa-chart-bar"></i> Xem kết quả
                        </button>
                    </div>
                    <div class="test-card-actions">
                        <button class="btn btn-monitor" onclick="app.openMonitor('${test.code}')" title="Giám sát trực tiếp">
                            <i class="fa-solid fa-satellite-dish"></i> Giám sát
                        </button>
                        <button class="btn btn-outline btn-icon" onclick="app.copyCode('${test.code}')" title="Copy mã">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                        <button class="btn btn-danger btn-icon" onclick="app.deleteTest('${test.code}')" title="Xóa">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        if (container.innerHTML === '') {
            container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>Không tìm thấy đề nào.</p></div>`;
        }
    },

    copyCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            app.showToast('success', `Đã copy mã <b>${code}</b> vào clipboard!`);
        }).catch(() => {
            app.showToast('info', `Mã đề: ${code}`);
        });
    },

    async deleteTest(code) {
        const result = await Swal.fire({
            title: 'Xác nhận xóa?',
            text: `Đề thi mã "${code}" và toàn bộ kết quả sẽ bị xóa vĩnh viễn!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Xóa luôn',
            cancelButtonText: 'Hủy',
            background: '#1e1b4b', color: '#f1f5f9'
        });

        if (!result.isConfirmed) return;

        LocalDB.deleteTest(code);
        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            try { await CloudDB.deleteTest(code); } catch (e) { }
        }
        app.showToast('success', `Đã xóa đề thi ${code}`);
        app.renderMyTests();
    },

    // ══════════════════════════════
    // RESULTS DETAIL
    // ══════════════════════════════
    async viewTestResults(code) {
        app.viewingTestCode = code;

        let test = null;
        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            try { test = await CloudDB.getTest(code); } catch (e) { }
        }
        if (!test) test = LocalDB.getTest(code);

        document.getElementById('results-test-name').textContent = test?.name || code;
        document.getElementById('results-test-meta').textContent =
            `Mã: ${code} · ${test?.questions?.length || '?'} câu · ${test?.timeLimit ? test.timeLimit + ' phút' : 'Không giới hạn'}`;

        app.navigate('teacher-results-detail');

        const tbody = document.getElementById('results-tbody');
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px"><div class="spinner" style="margin:auto"></div></td></tr>`;

        let results = [];
        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            try { results = await CloudDB.getResults(code); } catch (e) { }
        }
        if (results.length === 0) results = LocalDB.getResults(code);

        if (results.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="results-empty"><i class="fa-solid fa-inbox"></i><br>Chưa có học sinh nào nộp bài.</td></tr>`;
            return;
        }

        // Sort by submittedAt desc
        results.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

        tbody.innerHTML = results.map((r, i) => {
            const scoreNum = parseFloat(r.score);
            const pillClass = scoreNum >= 8 ? 'high' : scoreNum >= 5 ? 'medium' : 'low';
            const time = r.submittedAt ? new Date(r.submittedAt).toLocaleString('vi-VN') : 'N/A';
            return `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${r.studentName}</strong></td>
                    <td><span class="score-pill ${pillClass}">${r.score} điểm</span></td>
                    <td>${r.correct} / ${r.total}</td>
                    <td>${time}</td>
                </tr>
            `;
        }).join('');
    },

    exportCSV() {
        const code = app.viewingTestCode;
        const testName = document.getElementById('results-test-name').textContent;
        const rows = document.querySelectorAll('#results-tbody tr');

        let csv = `Đề thi,Mã,Họ tên,Điểm,Câu đúng,Thời gian nộp\n`;
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 5) return;
            const name = cells[1].textContent.trim();
            const score = cells[2].textContent.replace(/điểm/, '').trim();
            const cor = cells[3].textContent.trim();
            const time = cells[4].textContent.trim();
            csv += `"${testName}","${code}","${name}","${score}","${cor}","${time}"\n`;
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `KetQua_${code}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.csv`;
        link.click();
        app.showToast('success', 'Đã xuất file CSV thành công!');
    },

    // ══════════════════════════════
    // STUDENT PORTAL
    // ══════════════════════════════

    async enterExamRoom() {
        const nameInput = document.getElementById('student-name');
        const codeInput = document.getElementById('test-code');
        const name = nameInput.value.trim();
        const code = codeInput.value.trim().toUpperCase();

        if (!name) { app.showToast('error', 'Vui lòng nhập họ tên của bạn!'); nameInput.focus(); return; }
        if (!code) { app.showToast('error', 'Vui lòng nhập mã bài thi!'); codeInput.focus(); return; }

        const btn = document.getElementById('btn-enter-exam');
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;margin:0;border-width:2px"></div> Đang tìm đề...';

        let test = null;

        // Try cloud first
        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            try { test = await CloudDB.getTest(code); } catch (e) { }
        }
        // Fallback to local
        if (!test) test = LocalDB.getTest(code);

        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Bắt đầu làm bài';

        if (!test) {
            Swal.fire({
                title: 'Không tìm thấy đề',
                html: `Mã <b style="color:#6366f1">${code}</b> không tồn tại.<br><small style="color:#94a3b8">Kiểm tra lại mã hoặc hỏi giáo viên.</small>`,
                icon: 'error', background: '#1e1b4b', color: '#f1f5f9'
            });
            return;
        }

        // Check if room is locked
        const isLocked = IS_FIREBASE_CONFIGURED && firebaseDb
            ? (await firebaseDb.ref(`exam-controls/${code}/examLocked`).once('value')).val()
            : LocalDB.getControl(code, 'examLocked');
        if (isLocked) {
            Swal.fire({
                title: '🔒 Phòng thi đã đóng',
                text: 'Giáo viên đã khóa phòng thi. Vui lòng liên hệ giáo viên.',
                icon: 'error', background: '#1e1b4b', color: '#f1f5f9'
            });
            return;
        }

        app.studentName = name;
        app.prepareExam(test);
    },

    // ══════════════════════════════
    // EXAM LOGIC
    // ══════════════════════════════
    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    prepareExam(originalTest) {
        // Deep copy
        let questions = JSON.parse(JSON.stringify(originalTest.questions));

        if (originalTest.shuffleSettings) {
            questions = app.shuffleArray(questions);
            questions.forEach(q => {
                const correctId = q.options[q.correctAnswerIndex]?.id;
                q.options = app.shuffleArray(q.options);
                q.correctAnswerIndex = q.options.findIndex(o => o.id === correctId);
            });
        }

        app.activeExam = { ...originalTest, questions };
        app.answers = {};

        // Update UI headers
        document.getElementById('exam-title-display').textContent = app.activeExam.name;
        document.getElementById('exam-student-name').textContent = `Thí sinh: ${app.studentName}`;

        // Register student session for monitoring
        app.joinSession(app.activeExam.code);

        // Render questions
        app.renderActiveExam();
        app.navigate('student-exam');
        app.updateProgressBar();

        // Timer
        const timerWrap = document.getElementById('exam-timer-wrap');
        timerWrap.classList.remove('timer-warning');

        if (app.timerInterval) clearInterval(app.timerInterval);

        if (app.activeExam.timeLimit > 0) {
            app.timeRemaining = app.activeExam.timeLimit * 60;
            app.updateTimerDisplay();
            app.timerInterval = setInterval(() => {
                app.timeRemaining--;
                app.updateTimerDisplay();

                // Warning at 5 minutes
                if (app.timeRemaining === 300) {
                    timerWrap.classList.add('timer-warning');
                    app.showToast('warning', '⏰ Còn 5 phút — hãy kiểm tra lại bài!');
                }
                // Warning at 1 minute
                if (app.timeRemaining === 60) {
                    app.showToast('error', '🚨 Còn 1 phút! Nộp bài ngay!');
                }

                if (app.timeRemaining <= 0) {
                    clearInterval(app.timerInterval);
                    Swal.fire({
                        title: '⏰ Hết giờ!',
                        text: 'Hệ thống tự động nộp bài.',
                        icon: 'warning',
                        timer: 2500,
                        timerProgressBar: true,
                        showConfirmButton: false,
                        background: '#1e1b4b', color: '#f1f5f9'
                    }).then(() => app.processGrade());
                }
            }, 1000);
        } else {
            document.getElementById('timer-display').textContent = '∞';
        }
    },

    updateTimerDisplay() {
        const h = Math.floor(app.timeRemaining / 3600);
        const m = Math.floor((app.timeRemaining % 3600) / 60);
        const s = app.timeRemaining % 60;
        let txt = '';
        if (h > 0) txt += `${h}:`;
        txt += `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        document.getElementById('timer-display').textContent = txt;
    },

    renderActiveExam() {
        const qContainer = document.getElementById('live-question-list');
        const navContainer = document.getElementById('question-nav-grid');
        qContainer.innerHTML = '';
        navContainer.innerHTML = '';

        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

        app.activeExam.questions.forEach((q, idx) => {
            // Nav box
            navContainer.innerHTML += `
                <div class="nav-box" id="nav-box-${q.id}"
                    onclick="document.getElementById('live-q-${q.id}').scrollIntoView({behavior:'smooth',block:'start'})"
                    title="Câu ${idx + 1}">${idx + 1}</div>`;

            // Question block
            const optsHtml = q.options.map((opt, oIdx) => `
                <label class="live-opt-label" id="label-${q.id}-${opt.id}">
                    <input type="radio" name="${q.id}" value="${opt.id}"
                        onchange="app.selectAnswer('${q.id}', '${opt.id}')">
                    <span><b>${letters[oIdx]}.</b> ${opt.text}</span>
                </label>
            `).join('');

            qContainer.innerHTML += `
                <div class="live-q-block" id="live-q-${q.id}">
                    <div class="live-q-text">Câu ${idx + 1}: ${q.text}</div>
                    <div class="live-options">${optsHtml}</div>
                </div>
            `;
        });
    },

    selectAnswer(qId, oId) {
        app.answers[qId] = oId;

        // Update radio styling
        document.querySelectorAll(`input[name="${qId}"]`).forEach(input => {
            input.closest('.live-opt-label').classList.remove('selected');
        });
        const selectedLabel = document.querySelector(`input[name="${qId}"][value="${oId}"]`);
        if (selectedLabel) selectedLabel.closest('.live-opt-label').classList.add('selected');

        // Nav box
        const navBox = document.getElementById(`nav-box-${qId}`);
        if (navBox) navBox.classList.add('answered');

        // Progress bar
        app.updateProgressBar();

        // Update session progress for monitoring
        if (app.sessionId && app.activeExam) {
            const answered = Object.keys(app.answers).length;
            const code = app.activeExam.code;
            LocalDB.updateSession(code, app.sessionId, { answeredCount: answered });
            if (IS_FIREBASE_CONFIGURED && firebaseDb) {
                firebaseDb.ref(`sessions/${code}/${app.sessionId}/answeredCount`).set(answered);
            }
        }
    },

    updateProgressBar() {
        const total = app.activeExam?.questions?.length || 0;
        const answered = Object.keys(app.answers).length;
        const pct = total > 0 ? (answered / total) * 100 : 0;

        const bar = document.getElementById('exam-progress-bar');
        const txt = document.getElementById('progress-text');
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.textContent = `${answered} / ${total} câu`;

        // ARIA
        const role = document.getElementById('progress-bar-role');
        if (role) role.setAttribute('aria-valuenow', Math.round(pct));
    },

    submitExam() {
        const answered = Object.keys(app.answers).length;
        const total = app.activeExam.questions.length;

        const isComplete = answered >= total;
        Swal.fire({
            title: isComplete ? 'Nộp bài?' : `Còn ${total - answered} câu chưa làm`,
            text: isComplete
                ? 'Bạn đã trả lời tất cả câu hỏi. Xác nhận nộp bài?'
                : `Bạn mới làm ${answered}/${total} câu. Bạn có chắc muốn nộp?`,
            icon: isComplete ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonText: 'Nộp bài',
            cancelButtonText: 'Tiếp tục làm',
            confirmButtonColor: '#6366f1',
            background: '#1e1b4b', color: '#f1f5f9'
        }).then(result => {
            if (result.isConfirmed) app.processGrade();
        });
    },

    // ══════════════════════════════
    // GRADING
    // ══════════════════════════════
    async processGrade() {
        if (app.timerInterval) clearInterval(app.timerInterval);

        let correct = 0;
        app.activeExam.questions.forEach(q => {
            const correctOpt = q.options[q.correctAnswerIndex];
            if (correctOpt && app.answers[q.id] === correctOpt.id) correct++;
        });

        const total = app.activeExam.questions.length;
        const score = ((correct / total) * 10).toFixed(1);
        const scoreNum = parseFloat(score);

        // Save result
        const result = {
            studentName: app.studentName,
            score,
            correct,
            total,
            submittedAt: Date.now()
        };

        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            try { await CloudDB.saveResult(app.activeExam.code, result); } catch (e) { }
        }
        LocalDB.saveResult(app.activeExam.code, result);

        // Update result UI
        document.getElementById('result-score').textContent = score;
        document.getElementById('result-correct-count').textContent = `${correct} / ${total}`;
        document.getElementById('result-student-name').textContent = app.studentName;

        // Score circle color
        const circle = document.getElementById('score-circle');
        circle.className = 'score-circle';
        if (scoreNum >= 8) circle.classList.add('score-high');
        else if (scoreNum >= 5) circle.classList.add('score-medium');
        else circle.classList.add('score-low');

        // Message
        const msgEl = document.getElementById('result-message');
        if (scoreNum >= 9) { msgEl.textContent = '🏆 Xuất sắc!'; msgEl.style.color = 'var(--success)'; }
        else if (scoreNum >= 8) { msgEl.textContent = '🎉 Rất tốt!'; msgEl.style.color = 'var(--success)'; }
        else if (scoreNum >= 7) { msgEl.textContent = '👍 Khá!'; msgEl.style.color = '#34d399'; }
        else if (scoreNum >= 5) { msgEl.textContent = '📖 Trung bình'; msgEl.style.color = 'var(--warning)'; }
        else { msgEl.textContent = '💪 Cần cố lên!'; msgEl.style.color = 'var(--danger)'; }

        // Finalize session for monitoring
        app.finalizeSession(score);

        // Handle view answers button
        const btnView = document.getElementById('btn-view-answers');
        const lockedNotice = document.getElementById('answers-locked-notice');

        if (app.activeExam.teacherControlledAnswers) {
            // Real-time teacher control mode
            btnView.style.display = 'inline-flex';
            app._setupAnswerCheck();
        } else {
            // Static setting
            btnView.style.display = app.activeExam.allowViewAnswers ? 'inline-flex' : 'none';
            btnView.disabled = false;
            if (lockedNotice) lockedNotice.classList.add('hidden');
        }

        app.navigate('result-screen');

        // 🎊 Confetti if score >= 8
        if (scoreNum >= 8) {
            setTimeout(() => app.triggerConfetti(), 300);
        }
    },

    _setupAnswerCheck() {
        const code = app.activeExam?.code;
        if (!code) return;
        const update = (open) => {
            const btn = document.getElementById('btn-view-answers');
            const notice = document.getElementById('answers-locked-notice');
            if (!btn) return;
            if (open) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Xem lại bài';
                if (notice) notice.classList.add('hidden');
            } else {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-lock"></i> Chờ giáo viên mở đáp án...';
                if (notice) notice.classList.remove('hidden');
            }
        };
        // Initial check
        const initVal = IS_FIREBASE_CONFIGURED && firebaseDb ? false
            : LocalDB.getControl(code, 'answersOpen') || false;
        update(initVal);
        // Firebase listener
        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            firebaseDb.ref(`exam-controls/${code}/answersOpen`).on('value', snap => update(snap.val() || false));
        } else {
            app.answerCheckInterval = setInterval(() => {
                update(LocalDB.getControl(code, 'answersOpen') || false);
            }, 4000);
        }
    },

    // ══════════════════════════════
    // 🎊 CONFETTI
    // ══════════════════════════════
    triggerConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        const ctx = canvas.getContext('2d');
        canvas.style.display = 'block';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#38bdf8', '#f472b6', '#fbbf24'];
        const pieces = Array.from({ length: 180 }, () => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 80,
            w: Math.random() * 12 + 5,
            h: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            vy: Math.random() * 4 + 2,
            vx: (Math.random() - 0.5) * 3,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 7,
            opacity: 1
        }));

        let frame;
        const startTime = Date.now();

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const elapsed = Date.now() - startTime;
            let alive = false;

            pieces.forEach(p => {
                p.y += p.vy;
                p.x += p.vx;
                p.rotation += p.rotSpeed;
                if (elapsed > 2500) p.opacity = Math.max(0, p.opacity - 0.02);
                if (p.y < canvas.height + 20 && p.opacity > 0) alive = true;

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });

            if (alive) {
                frame = requestAnimationFrame(animate);
            } else {
                canvas.style.display = 'none';
            }
        }

        animate();
        setTimeout(() => {
            cancelAnimationFrame(frame);
            canvas.style.display = 'none';
        }, 5000);
    },

    // ══════════════════════════════
    // VIEW ANSWERS
    // ══════════════════════════════
    viewAnswers() {
        app.navigate('student-exam');

        // Hide submit button in review mode
        const submitBtn = document.getElementById('btn-submit-exam');
        if (submitBtn) submitBtn.style.display = 'none';

        // Hide progress bar
        document.querySelector('.progress-wrap').style.display = 'none';

        app.activeExam.questions.forEach(q => {
            const correctOpt = q.options[q.correctAnswerIndex];
            if (!correctOpt) return;

            // Highlight correct answer
            const correctLabel = document.getElementById(`label-${q.id}-${correctOpt.id}`);
            if (correctLabel) {
                correctLabel.classList.add('answer-correct');
                correctLabel.innerHTML += `&nbsp;<span class="badge" style="background:var(--success)"><i class="fa-solid fa-check"></i> Đúng</span>`;
            }

            // Highlight wrong chosen answer
            const chosenId = app.answers[q.id];
            if (chosenId && chosenId !== correctOpt.id) {
                const wrongLabel = document.getElementById(`label-${q.id}-${chosenId}`);
                if (wrongLabel) {
                    wrongLabel.classList.add('answer-wrong');
                    wrongLabel.innerHTML += `&nbsp;<span class="badge" style="background:var(--danger)"><i class="fa-solid fa-xmark"></i> Sai</span>`;
                }
            }
        });
    },

    // ══════════════════════════════
    // RESET STATE
    // ══════════════════════════════
    resetExamState() {
        if (app.timerInterval) clearInterval(app.timerInterval);
        if (app.answerCheckInterval) { clearInterval(app.answerCheckInterval); app.answerCheckInterval = null; }
        app.activeExam = null;
        app.answers = {};
        app.sessionId = null;

        // Safely restore submit button & progress bar
        const submitBtn = document.getElementById('btn-submit-exam');
        if (submitBtn) submitBtn.style.display = 'inline-flex';

        const btnView = document.getElementById('btn-view-answers');
        if (btnView) { btnView.disabled = false; btnView.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Xem lại bài'; }

        const progressWrap = document.querySelector('.progress-wrap');
        if (progressWrap) progressWrap.style.display = 'flex';

        const timerWrap = document.getElementById('exam-timer-wrap');
        if (timerWrap) timerWrap.classList.remove('timer-warning');
    },

    // ══════════════════════════════
    // TOAST NOTIFICATIONS
    // ══════════════════════════════
    showToast(type = 'info', message, duration = 3500) {
        const container = document.getElementById('toast-container');
        const icons = {
            success: '<i class="fa-solid fa-circle-check" style="color:var(--success)"></i>',
            error: '<i class="fa-solid fa-circle-xmark" style="color:var(--danger)"></i>',
            warning: '<i class="fa-solid fa-triangle-exclamation" style="color:var(--warning)"></i>',
            info: '<i class="fa-solid fa-circle-info" style="color:var(--primary)"></i>'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    },

    // ══════════════════════════════
    // FIREBASE SETUP GUIDE
    // ══════════════════════════════
    // ══════════════════════════════════════════
    // SESSION TRACKING (student side)
    // ══════════════════════════════════════════
    joinSession(code) {
        app.sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        const data = {
            studentName: app.studentName,
            joinedAt: Date.now(),
            answeredCount: 0,
            totalQuestions: app.activeExam.questions.length,
            status: 'in-progress',
            score: null
        };
        LocalDB.saveSession(code, app.sessionId, data);
        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            firebaseDb.ref(`sessions/${code}/${app.sessionId}`).set(data);
        }
    },

    finalizeSession(score) {
        if (!app.sessionId || !app.activeExam) return;
        const code = app.activeExam.code;
        const update = { status: 'submitted', score, submittedAt: Date.now() };
        LocalDB.updateSession(code, app.sessionId, update);
        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            firebaseDb.ref(`sessions/${code}/${app.sessionId}`).update(update);
        }
    },

    // ══════════════════════════════════════════
    // MONITOR DASHBOARD (teacher side)
    // ══════════════════════════════════════════
    openMonitor(code) {
        app.monitoringCode = code;
        app.navigate('teacher-monitor');
    },

    async loadMonitorData() {
        const code = app.monitoringCode;
        if (!code) return;

        // Load test info
        let test = LocalDB.getTest(code);
        if (!test && IS_FIREBASE_CONFIGURED && firebaseDb) {
            try { test = await CloudDB.getTest(code); } catch (e) { }
        }
        if (test) {
            document.getElementById('monitor-test-name').textContent = test.name;
            document.getElementById('monitor-code').textContent = code;
        }

        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            // Real-time Firebase listeners
            firebaseDb.ref(`sessions/${code}`).on('value', snap => {
                const val = snap.val();
                app.renderMonitor(val ? Object.values(val) : []);
            });
            firebaseDb.ref(`exam-controls/${code}`).on('value', snap => {
                const ctrl = snap.val() || {};
                const togAnswers = document.getElementById('toggle-answers-open');
                const togLock = document.getElementById('toggle-exam-lock');
                if (togAnswers) togAnswers.checked = ctrl.answersOpen || false;
                if (togLock) togLock.checked = ctrl.examLocked || false;
            });
        } else {
            // Local mode: poll
            app.renderMonitor(LocalDB.getSessions(code));
            const ctrl = { answersOpen: LocalDB.getControl(code, 'answersOpen'), examLocked: LocalDB.getControl(code, 'examLocked') };
            const togAnswers = document.getElementById('toggle-answers-open');
            const togLock = document.getElementById('toggle-exam-lock');
            if (togAnswers) togAnswers.checked = ctrl.answersOpen || false;
            if (togLock) togLock.checked = ctrl.examLocked || false;
            app.monitorInterval = setInterval(() => {
                app.renderMonitor(LocalDB.getSessions(code));
            }, 4000);
        }
    },

    refreshMonitor() {
        const code = app.monitoringCode;
        if (!code) return;
        app.renderMonitor(LocalDB.getSessions(code));
        app.showToast('info', 'Đã làm mới danh sách.');
    },

    renderMonitor(sessions) {
        const grid = document.getElementById('monitor-sessions-grid');
        if (!grid) return;
        const inProgress = sessions.filter(s => s.status === 'in-progress');
        const submitted = sessions.filter(s => s.status === 'submitted');
        document.getElementById('stat-joined').textContent = sessions.length;
        document.getElementById('stat-in-progress').textContent = inProgress.length;
        document.getElementById('stat-submitted').textContent = submitted.length;
        const avg = submitted.length
            ? (submitted.reduce((s, r) => s + parseFloat(r.score || 0), 0) / submitted.length).toFixed(1)
            : '---';
        document.getElementById('stat-avg-score').textContent = avg;

        if (!sessions.length) {
            grid.innerHTML = `<div class="monitor-empty"><i class="fa-solid fa-satellite-dish"></i><p>Chưa có học sinh nào vào phòng thi.<br><small>Chia sẻ mã <b style="color:var(--primary)">${app.monitoringCode}</b> cho học sinh.</small></p></div>`;
            return;
        }
        grid.innerHTML = sessions.map(s => {
            const pct = s.totalQuestions > 0 ? Math.round(s.answeredCount / s.totalQuestions * 100) : 0;
            const isSub = s.status === 'submitted';
            const joinTime = new Date(s.joinedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const scoreColor = parseFloat(s.score) >= 8 ? 'var(--success)' : parseFloat(s.score) >= 5 ? 'var(--warning)' : 'var(--danger)';
            return `
                <div class="session-card ${isSub ? 'status-submitted' : 'status-in-progress'}">
                    <div class="session-card-header">
                        <div class="session-name">${s.studentName}</div>
                        <span class="session-status-badge ${isSub ? 'submitted' : 'in-progress'}">${isSub ? '✓ Đã nộp' : '✏️ Đang làm'}</span>
                    </div>
                    <div class="session-progress-label"><span>Tiến độ</span><span>${s.answeredCount}/${s.totalQuestions} câu</span></div>
                    <div class="session-progress-bg"><div class="session-progress-fill ${pct >= 100 ? 'complete' : ''}" style="width:${pct}%"></div></div>
                    ${isSub
                    ? `<div class="session-score" style="color:${scoreColor}">${s.score} điểm</div>`
                    : `<div class="session-join-time"><span class="pulse-dot"></span>Vào lúc ${joinTime}</div>`
                }
                </div>`;
        }).join('');
    },

    async toggleAnswersOpen(open) {
        const code = app.monitoringCode;
        if (!code) return;
        LocalDB.setControl(code, 'answersOpen', open);
        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            await firebaseDb.ref(`exam-controls/${code}/answersOpen`).set(open);
        }
        app.showToast(open ? 'success' : 'info', open ? '🔓 Đã mở đáp án cho học sinh!' : '🔒 Đã đóng đáp án');
    },

    async toggleExamLock(locked) {
        const code = app.monitoringCode;
        if (!code) return;
        LocalDB.setControl(code, 'examLocked', locked);
        if (IS_FIREBASE_CONFIGURED && firebaseDb) {
            await firebaseDb.ref(`exam-controls/${code}/examLocked`).set(locked);
        }
        app.showToast(locked ? 'warning' : 'success', locked ? '🔒 Phòng thi đã bị khóa, HS mới không vào được.' : '🔓 Phòng thi đã mở lại.');
    },

    showFirebaseSetup() {
        Swal.fire({
            title: '🔥 Cách cài đặt Firebase',
            html: `
                <div style="text-align:left;font-size:0.9rem;line-height:1.8">
                    <ol style="padding-left:20px;display:flex;flex-direction:column;gap:8px">
                        <li>Vào <a href="https://console.firebase.google.com" target="_blank" style="color:#6366f1">console.firebase.google.com</a></li>
                        <li>Nhấn <b>"Add project"</b> → Đặt tên → <b>Create project</b></li>
                        <li>Vào <b>Project Settings (⚙️)</b> → <b>"Your apps"</b> → Icon <b>&lt;/&gt;</b> (Web)</li>
                        <li>Đặt tên app → <b>Register app</b> → Copy <code>firebaseConfig</code></li>
                        <li>Dán config vào <code>FIREBASE_CONFIG</code> ở đầu file <b>app.js</b></li>
                        <li>Vào <b>Build → Realtime Database</b> → <b>Create database</b></li>
                        <li>Chọn <b>"Start in test mode"</b> → Enable</li>
                        <li>Tải lại trang — biểu ngữ vàng sẽ biến mất! 🎉</li>
                    </ol>
                </div>
            `,
            icon: 'info',
            background: '#1a0f3a', color: '#f1f5f9',
            confirmButtonColor: '#6366f1',
            confirmButtonText: 'Đã hiểu!'
        });
    }
};

// ══════════════════════════════
// BOOT
// ══════════════════════════════
document.addEventListener('DOMContentLoaded', () => app.init());