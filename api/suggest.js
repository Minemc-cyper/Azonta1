export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) {
        return res.status(500).json({ error: 'Server is missing GROQ_API_KEY environment variable. Lên bảng điều khiển Vercel cài đặt nhé!' });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Thiếu đoạn prompt truy vấn' });
        }

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });

        if (groqRes.status === 413) throw new Error('Đề thi quá dài (Lỗi 413).');
        if (groqRes.status === 429) throw new Error('API quá tải (429).');
        if (!groqRes.ok) throw new Error(`Lỗi từ máy chủ API: HTTP ${groqRes.status}`);

        const data = await groqRes.json();
        
        // Trả kết quả JSON về cho Frontend
        res.status(200).json(data);
    } catch (error) {
        console.error('Vercel API Error:', error);
        res.status(500).json({ error: error.message });
    }
}
