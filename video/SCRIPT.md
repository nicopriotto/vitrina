# Vitrina — guion v5 (aprobado y producido)

Voz: ElevenLabs "Chris", eleven_v4, una línea por pedido con su dirección de interpretación (audio tags) y request stitching, sin next_text para que cada frase cierre (tools/voice/v4take.mjs → public/audio/voice-v4c.wav, 161 s).

## La idea en una línea

**"Your next customer won't browse your store. They'll send an agent."**
Una historia con dos personajes y un círculo cerrado: Sam le pide a su agente una remera y el agente **no encuentra** la tienda chica. Maya conecta su tienda a Vitrina. Volvemos a Sam, **mismo pedido**, y esta vez el agente la encuentra, arma la orden y Sam paga con PayPal. La plata le llega a Maya.

## El motivo visual (lo que lo hace único)

**Vitrina = shop window = vidrio.** Para un agente, una tienda chica es un vidrio esmerilado: la ve borrosa, no puede leer nada. Vitrina **limpia el vidrio**.

- Cuando la tienda es invisible para el agente, el plano se **esmerila** (blur + grano). Cuando Vitrina la lee, el vidrio se aclara producto por producto. En el clímax queda transparente.
- **Dos vistas**: "lo que ve una persona" (la tienda linda) contra "lo que ve un agente" (el HTML crudo de esa misma página). El mismo HTML vuelve después convertido en datos limpios: callback visual.
- Una sola paleta: grafito + naranja Vitrina. El **azul PayPal aparece solo cuando entra PayPal** (largo de cola, MCP→PayPal, el pago, la plata). Así PayPal se lee como el desenlace.
- Tipografía cinética solo dos veces: el hook y el clímax.
- Música con un drop en "Lumen is now an MCP server" (hoy el video no tiene música; es gran parte de por qué se siente amateur).

## Guion (≈250 palabras, ≈100 s)

| # | Acto | Voz | Imagen |
|---|---|---|---|
| 01 | Hook | Your next customer won't browse your store. | Tipografía cinética sobre grafito. Detrás, la tienda Lumen se aleja y se esmerila. |
| 02 | | They'll send an agent. | La palabra "agent" se convierte en un cursor de chat que parpadea. |
| 03 | | Like Sam, tonight. "Find me a black tee, size M, under forty dollars. And buy it." | Un cliente de chat en ventana inclinada, 11:04 PM. El mensaje se escribe al ritmo de la voz. |
| 04 | | The agent checks the big stores. It never finds Lumen. | Llamadas del agente apareciendo (search…), resultados de marketplaces grandes. Lumen no está. |
| 05 | | Lumen is a small shop in Brooklyn. Same tee. Invisible. | Footage de la tienda con scroll. En "Same tee" la cámara llega a la remera negra $32. En "Invisible" el vidrio se esmerila. |
| 06 | Problema | Because agents don't see a storefront. They see this. | Pantalla partida: la tienda / el HTML real de esa página, una sopa de divs. El precio enterrado en un `<span>`. |
| 07 | | No product feed. No API. No checkout they can call. | Terminal: `GET /products.json → 404`, `GET /api → 404`, `POST /checkout → 403`, uno por frase. |
| 08 | | PayPal is bringing agentic checkout to the big platforms. The small stores are left behind. | Curva de "long tail": la cabeza (plataformas grandes) se ilumina en azul PayPal; la cola larga de tiendas chicas queda apagada. Lumen es un punto en la cola. |
| 09 | Giro | So we built Vitrina. In Spanish, it means shop window. This one's for agents. | Entrada de diccionario: **vitrina** *(n.) shop window*. El vidrio se forma alrededor del logo. |
| 10 | Entrada | Maya runs Lumen. She pastes her store's URL, and the PayPal email where she gets paid. That's it. | Footage de Vitrina: plano general 1,5 s, acercamiento al formulario, se escribe, click (cursor solo ahí). |
| 11 | | Vitrina reads the store the way a person would. Every product, every size and color, every price. | Footage de la ingesta: los productos van entrando y el vidrio se aclara uno por uno. |
| 12 | | And turns it into a catalog an agent understands. | El HTML del plano 06 se transforma en el JSON limpio de la misma remera (talles, colores, $32.00). |
| 13 | Clímax | A minute later, Lumen is live on Vitrina. An MCP server, wired to PayPal. | Drop de la música. Footage de la tienda lista, tipografía cinética "Lumen is live on Vitrina." |
| 14 | | And shoppers don't add stores one by one. They add Vitrina once, in Claude, ChatGPT or Gemini. Every Vitrina store is one search away. Lumen included. | Las tiendas de Vitrina aparecen una por una. Claude, ChatGPT y Gemini entran de a uno con "+ Vitrina" y se conectan a un solo nodo vitrina/. En "one search" un pulso viaja a todas las tiendas; en "Lumen included" Lumen se ilumina con la remera. |
| 15 | Desenlace | Back to Sam. His assistant has Vitrina now. Same request. | El mismo chat del plano 03, ahora con "Vitrina connected". |
| 16 | | This time, the agent finds Lumen's tee. Black, size M, thirty-two dollars. | Tool call `search_products` → tarjeta del producto con la foto real de Lumen. |
| 17 | | It builds the order. Vitrina prices it on the server, so the agent can't make up a total. | `create_checkout` → resumen de la orden; el total se calcula y aparece un sello chico "priced by the store". |
| 18 | | Then the agent stops. Paying is Sam's call. | El chat se queda quieto en el botón "Approve with PayPal". |
| 19 | | Sam approves with PayPal. Paid. | Hoja de aprobación de PayPal, click, sello PAID. |
| 20 | | And the money goes straight to Maya's PayPal account. | La línea Sam → PayPal → Maya se dibuja; llega la notificación "+$32.00". |
| 20b | Cómo cobra | So how does a store with no checkout get paid? Maya's PayPal email is the whole setup. When an agent checks out, Vitrina creates a PayPal order. The items and the total come from Lumen's catalog. The payee is Maya. Sam's card and address stay inside PayPal. The agent never sees them. | La orden de PayPal se arma fila por fila con sus fuentes: Maya (payee), el catálogo (ítems y total), la cuenta PayPal de Sam (tarjeta y dirección, borrosas para el agente). |
| 21 | Envío | Then Maya does what she always does. The order lands in her dashboard, with Sam's address. She packs it, ships it, and marks it shipped. And she can see every step the agent took. | Footage de Orders: la fila entra en vivo con la dirección de Sam, la cámara se acerca a "Ship to", aparece una etiqueta de envío, click en "Mark as shipped". Después el log de tool calls. |
| 22 | Cierre | Vitrina. Any store, ready for agents. Wired to PayPal. | End card, una sola vez, con el vidrio limpio. |
| 23 | | Agents shop. Humans approve. | Última línea sobre el end card. |

## Texto de la voz (una línea por pedido, con su dirección)

[Confident, warm, like the opening line of a keynote] Your next customer won't browse your store.
[A beat, then a knowing smile] Instead... they'll send an agent.

[Relaxed storytelling] Take Sam. Tonight he asks his assistant: [casual, quoting him] "Find me a black tee, size M, under forty dollars. And buy it."
[Matter-of-fact] So the agent checks the big stores... [slight letdown] but it never finds Lumen.
[Warm] Lumen is a small shop in Brooklyn that sells that exact tee. [Quieter, landing the point] But to the agent, it's invisible.

[Clear, explaining] That's because agents don't see a storefront. [Brief pause] They see this.
[Measured, each item landing] There's no product feed, no A.P.I., and no checkout they can call.
[Serious, a little concerned] PayPal is bringing agentic checkout to the big platforms, but small stores like Lumen are left behind.

[Turning point, brighter, building energy] So we built Vitrina. [Warm aside] In Spanish, it means shop window. [Confident, with a smile] And this one is made for agents.

[Friendly, walking through a demo] Here's how it works. Maya, who runs Lumen, pastes her store's U.R.L. and the PayPal email where she gets paid. [Simple, settled] That's all.
[Clear, steady pace] Then Vitrina reads the store the way a person would: every product, every size and color, every price.
[Satisfied, settled] And it turns all of that into a catalog an agent understands.

[Payoff, energized and proud] A minute later, Lumen is live on Vitrina, as an M.C.P. server wired to PayPal.
[Conversational] And shoppers don't have to add stores one by one. [Confident] They add Vitrina once, in Claude, Chat G.P.T. or Gemini.
[Building, then landing with a smile] From then on, every Vitrina store is one search away... Lumen included.

[Back to the story, warm] So let's go back to Sam. His assistant has Vitrina now, and he makes the same request.
[Pleased, crisp] This time, the agent finds Lumen's tee: black, size M, thirty-two dollars.
[Reassuring explanation] It builds the order, and Vitrina prices it on the server, so the agent can't make up a total.
[Slower, deliberate] Then the agent stops... because the payment is Sam's call.
[Light, satisfied] Sam approves with PayPal, and the order is paid.
[Warm, settled] The money goes straight to Maya's PayPal account.

[Curious, asking the viewer directly] But how does a store with no checkout get paid?
[Simple, confident] It's simple: Maya's PayPal email is the whole setup.
[Clear, steady explanation] When an agent checks out, Vitrina creates a PayPal order. The items and the total come from Lumen's catalog, and the payee is Maya.
[Calm, reassuring] Sam's card and address stay inside PayPal, so the agent never sees them.

[Relaxed, everyday] After that, Maya does what she always does. The order lands in her dashboard, with Sam's address.
[Easy rhythm] She packs it, ships it, and marks it shipped. [Thoughtful] And she can see every step the agent took.

[Closing, confident and proud] That's Vitrina. Any store, ready for agents, and wired to PayPal.
[Slow, low, final sign-off with falling intonation] Agents shop. [Brief pause] Humans approve.
