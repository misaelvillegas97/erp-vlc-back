import { Injectable } from '@nestjs/common';
import axios from 'axios';

export type TriagerOut = {
  summary: string;
  type: 'bug' | 'consulta' | 'feature' | 'incidencia';
  priority?: 'alta' | 'media' | 'baja';
  reason?: string;
  reply?: string;
};

@Injectable()
export class AiService {
  async summarize(dto: { subject: string; description: string }) {
    const sys = 'Triager ERP/Flota. Devuelve JSON: summary(<=80w), type, priority, reason, reply.';
    const user = `Asunto: ${dto.subject}\nDescripción: ${dto.description}`;
    const t0 = Date.now();

    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ]
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const latency_ms = Date.now() - t0;
    const data = res.data;
    const out = JSON.parse(data.choices[0]?.message?.content || '{}') as TriagerOut;

    return {
      out,
      meta: {
        model: data.model,
        prompt_tokens: data.usage?.prompt_tokens ?? 0,
        completion_tokens: data.usage?.completion_tokens ?? 0,
        cost_usd: 0,
        latency_ms,
        request_snapshot: { sys, user },
        response_snapshot: out
      }
    };
  }
}
