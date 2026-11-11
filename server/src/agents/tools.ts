import type Anthropic from '@anthropic-ai/sdk';
import { createCallbackRequest, type Channel } from './store';

type Tool = Anthropic.Beta.Messages.BetaTool;

export interface ToolContext {
  channel: Channel;
  customerPhone: string;
  /** Phone: whether the caller can be transferred to a person right now. */
  canTransfer: boolean;
  /** Set by tools; the channel code acts on these after the reply. */
  handoffReason: string | null;
  endCall: boolean;
  /** Messages for the practice owner (sent on WhatsApp). */
  notifications: string[];
}

const schema = (properties: Record<string, unknown>, required: string[]) => ({
  type: 'object' as const,
  properties,
  required,
  additionalProperties: false,
});

const requestCallback: Tool = {
  name: 'request_callback',
  description:
    'Zet een terugbelverzoek klaar voor de praktijk, bijvoorbeeld om een afspraak te plannen, te verzetten ' +
    'of te annuleren, of voor een vraag die je niet kunt beantwoorden. Vraag eerst de naam van de klant en ' +
    'waar het over gaat. Het telefoonnummer is al bekend.',
  input_schema: schema(
    {
      customer_name: { type: 'string' },
      reason: { type: 'string', description: 'Waar het over gaat, kort' },
      preference: { type: 'string', description: 'Voorkeur voor locatie, behandelaar of tijdstip; leeg als die er niet is' },
    },
    ['customer_name', 'reason', 'preference'],
  ),
  strict: true,
};

const handoff: Tool = {
  name: 'handoff_to_human',
  description:
    'Draagt het gesprek over aan een medewerker. Gebruik dit bij klachten, als de klant om een mens vraagt, ' +
    'of als je de vraag niet met de beschikbare informatie kunt beantwoorden.',
  input_schema: schema(
    {
      reason: { type: 'string' },
      summary: { type: 'string', description: 'Korte samenvatting voor de medewerker' },
    },
    ['reason', 'summary'],
  ),
  strict: true,
};

const endCall: Tool = {
  name: 'end_call',
  description:
    'Beëindigt het telefoongesprek na jouw laatste zin. Gebruik dit als de klant klaar is of afscheid neemt; ' +
    'zeg in dezelfde beurt eerst gedag.',
  input_schema: schema({}, []),
  strict: true,
};

export function toolsFor(channel: Channel): Tool[] {
  return channel === 'voice' ? [requestCallback, handoff, endCall] : [requestCallback, handoff];
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export async function executeTool(ctx: ToolContext, name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'request_callback': {
      const customerName = str(input.customer_name);
      const reason = str(input.reason);
      const preference = str(input.preference);
      if (!customerName || !reason) return 'Naam en reden zijn nodig om een terugbelverzoek klaar te zetten.';
      const id = await createCallbackRequest({ customerName, customerPhone: ctx.customerPhone, reason, preference, channel: ctx.channel });
      ctx.notifications.push(
        `📞 Terugbelverzoek #${id} (${ctx.channel === 'voice' ? 'telefoon' : 'WhatsApp'})\n` +
          `${customerName} — +${ctx.customerPhone.replace(/^\+/, '')}\n${reason}` +
          (preference ? `\nVoorkeur: ${preference}` : ''),
      );
      return 'Terugbelverzoek staat klaar; de praktijk belt de klant zo snel mogelijk terug (binnen een werkdag).';
    }
    case 'handoff_to_human':
      if (ctx.channel === 'voice' && !ctx.canTransfer) {
        return 'Doorverbinden kan nu niet (buiten werktijd of niemand beschikbaar). Bied aan dat de praktijk terugbelt en zet met de naam van de klant een terugbelverzoek klaar (request_callback).';
      }
      ctx.handoffReason = `${str(input.reason)} — ${str(input.summary)}`;
      return ctx.channel === 'voice'
        ? 'Overdracht gestart. Zeg de klant dat je doorverbindt met een medewerker.'
        : 'Overdracht gestart. Laat de klant weten dat een medewerker zo snel mogelijk reageert.';
    case 'end_call':
      ctx.endCall = true;
      return 'Het gesprek wordt na je laatste zin beëindigd.';
    default:
      throw new Error(`Onbekende tool: ${name}`);
  }
}
