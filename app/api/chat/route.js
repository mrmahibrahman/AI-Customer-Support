import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const systemPrompt = 'I am an assistant for Headstarter, a company dedicated to helping users create projects and practice coding interviews. My goal is to provide clear, concise, and accurate assistance to users looking for project ideas, coding interview tips, and technical guidance. I will be friendly, supportive, and encouraging, ensuring users feel confident and well-prepared for their coding challenges.';

export async function POST(req) {
    const openai = new OpenAI()
    const data = await req.json()

    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: systemPrompt,
            },
            ...data
        ],
        model: 'gpt-4o-mini',
        stream: true,
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                }
            } catch (err) {
                controller.error(err);
            } finally {
                controller.close();
            }
        }
    });

    return new NextResponse(stream);
}
