/**
 * content-templates.ts — the 5 shipped sample templates (HTML + plain text)
 *
 * Inputs:  none (static seed data)
 * Outputs: SEED_TEMPLATES[] — reconstructed from the operator's HTML samples
 * Used by: app/api/content-templates/seed (upsert on seed_key)
 *
 * `${name}` is kept verbatim as a merge placeholder (escaped here as \${name}).
 */

export interface SeedTemplate {
  seed_key: string;
  name: string;
  brand: string;
  locale: string;
  html: string;
  text: string;
}

const wrap = (inner: string) =>
  `<div style="background:#f4f5f7;padding:24px 0;font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;line-height:1.6;">` +
  `<div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px 36px;">${inner}</div></div>`;

const cta = (label: string, color: string) =>
  `<p style="text-align:center;margin:28px 0;"><a href="#" style="background:${color};color:#ffffff;` +
  `text-decoration:none;padding:12px 30px;border-radius:6px;font-weight:bold;display:inline-block;">${label}</a></p>`;

const footer = (address: string, unsub = true) =>
  `<hr style="border:none;border-top:1px solid #eeeeee;margin:28px 0;">` +
  `<p style="font-size:12px;color:#999999;">${address}</p>` +
  (unsub
    ? `<p style="font-size:12px;color:#999999;text-align:center;">In order to unsubscribe from this mailing list, please click here : <a href="#" style="color:#7a7a7a;">Unsubscribe</a></p>`
    : "");

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    seed_key: "lucky7even",
    name: "Lucky7even — Summer Top-Up",
    brand: "Lucky7even",
    locale: "en",
    html: wrap(
      `<p>Hey \${name},</p>` +
        `<p>🌸 As Canadians look ahead to another great summer season, there's no better time to get started with <strong style="color:#8e44ad;">Lucky7even</strong>.</p>` +
        `<p>Top Up Today and Enjoy a <strong>100 Percent Match</strong> up to <strong>CAD 750 + 50 Extra Rounds</strong></p>` +
        cta("Activate Now", "#5b2be0") +
        `<p>Top-up securely with Interac®, make your first top-up, and start exploring everything that's waiting for you.</p>` +
        `<p>Have a great one,<br>The Lucky7even Team</p>` +
        footer("4587 Granville Avenue, Office 312, Vancouver, BC V6H 3K9, Canada"),
    ),
    text: `Hey \${name},

As Canadians look ahead to another great summer season, there's no better time to get started with Lucky7even.

Top Up Today and Enjoy a 100 Percent Match up to CAD 750 + 50 Extra Rounds

Activate Now

Top-up securely with Interac®, make your first top-up, and start exploring everything that's waiting for you.

Have a great one,
The Lucky7even Team

4587 Granville Avenue, Office 312, Vancouver, BC V6H 3K9, Canada
In order to unsubscribe from this mailing list, please click here: Unsubscribe`,
  },

  {
    seed_key: "fortune-play",
    name: "Fortune Play — FUN500 (DE)",
    brand: "Fortune Play",
    locale: "de",
    html: wrap(
      `<div style="background:#1c1407;color:#f5d990;text-align:center;padding:22px;border-radius:8px;margin-bottom:22px;">` +
        `<div style="font-size:13px;letter-spacing:2px;color:#cbb27a;">FORTUNE PLAY</div>` +
        `<div style="font-size:26px;font-weight:bold;color:#ffffff;margin-top:8px;">20 FREISPIELE</div>` +
        `<div style="font-size:12px;color:#cbb27a;">KEINE EINZAHLUNG ERFORDERLICH</div>` +
        `<div style="font-size:30px;font-weight:bold;color:#f5a623;margin-top:10px;">500% BONUS</div>` +
        `<div style="font-size:12px;color:#cbb27a;">100 WEITERE FREISPIELE BEI DER ERSTEN EINZAHLUNG</div>` +
        `<div style="margin-top:14px;font-weight:bold;color:#ffffff;">Bonuscode: FUN500</div>` +
        cta("JETZT SPIELEN", "#f5a623") +
        `</div>` +
        `<p>Hallo,</p>` +
        `<p>ich wende mich mit dieser persönlichen Nachricht an dich, um dir das Angebot vorzustellen, das wir für ausgewählte Kunden entwickelt haben.</p>` +
        `<p>Wenn du dich anmeldest, findest du bereits kostenlose Runden in deinem Konto vor, sowie die Möglichkeit, mit dem Code <strong>FUN500</strong> zusätzlichen Wert freizuschalten, falls du dich entscheidest, Guthaben aufzuladen.</p>` +
        `<p><a href="#" style="color:#1a73e8;">Dein persönlicher Link</a></p>` +
        `<p>Wenn du Fragen hast, antworte einfach. Jemand aus dem Team wird sich bei dir melden.</p>` +
        `<p>Alles Gute,<br>das Support-Team</p>` +
        footer("Zeil 72, 60313 Frankfurt am Main, Germany", false),
    ),
    text: `Bonuscode: FUN500
20 FREISPIELE — KEINE EINZAHLUNG ERFORDERLICH
500% BONUS — 100 WEITERE FREISPIELE BEI DER ERSTEN EINZAHLUNG

Hallo,

ich wende mich mit dieser persönlichen Nachricht an dich, um dir das Angebot vorzustellen, das wir für ausgewählte Kunden entwickelt haben.

Wenn du dich anmeldest, findest du bereits kostenlose Runden in deinem Konto vor, sowie die Möglichkeit, mit dem Code FUN500 zusätzlichen Wert freizuschalten, falls du dich entscheidest, Guthaben aufzuladen.

Dein persönlicher Link

Wenn du Fragen hast, antworte einfach. Jemand aus dem Team wird sich bei dir melden.

Alles Gute,
das Support-Team`,
  },

  {
    seed_key: "rooster-bet",
    name: "Rooster.Bet — Wheel of Fortune (IT)",
    brand: "Rooster.Bet",
    locale: "it",
    html: wrap(
      `<p>Ciao,</p>` +
        `<p>Iscriviti oggi stesso a <strong style="color:#d6336c;">Rooster.Bet</strong> e accedi alla nostra Ruota della Fortuna gratuita.</p>` +
        `<p>Metti alla prova la tua fortuna per vincere fantastici premi e scopri cosa ti aspetta.</p>` +
        `<p>Quando sei pronto per iniziare, approfitta al massimo del tuo primo deposito e goditi un bonus del <strong>100%</strong> fino a €/$1000 + 150 giri gratuiti.</p>` +
        cta("Sblocca i tuoi giri", "#7c4dff") +
        `<p>La Ruota della Fortuna sta girando, i premi ti aspettano e il tuo viaggio inizia con una semplice registrazione.</p>` +
        `<p>Cordiali saluti,<br>Il team di <strong style="color:#d6336c;">Rooster.Bet</strong></p>` +
        footer("4587 Granville Avenue, Suite 312, Vancouver, BC V6H 3K9, Canada", false),
    ),
    text: `Ciao,

Iscriviti oggi stesso a Rooster.Bet e accedi alla nostra Ruota della Fortuna gratuita.

Metti alla prova la tua fortuna per vincere fantastici premi e scopri cosa ti aspetta.

Quando sei pronto per iniziare, approfitta al massimo del tuo primo deposito e goditi un bonus del 100% fino a €/$1000 + 150 giri gratuiti.

Sblocca i tuoi giri

La Ruota della Fortuna sta girando, i premi ti aspettano e il tuo viaggio inizia con una semplice registrazione.

Cordiali saluti,
Il team di Rooster.Bet

4587 Granville Avenue, Suite 312, Vancouver, BC V6H 3K9, Canada`,
  },

  {
    seed_key: "rocketspin",
    name: "RocketSpin — Account Active",
    brand: "RocketSpin",
    locale: "en",
    html: wrap(
      `<p>Hey \${name},</p>` +
        `<p>Your <strong style="color:#1a73e8;">RocketSpin</strong> account is now active, and you can explore the platform whenever you're ready. When you log in, you may notice additional access up to <strong>100</strong> rounds.</p>` +
        `<p>Everything on the platform is designed for entertainment purposes and to help you enjoy the experience at your own pace.</p>` +
        `<p>If you need help with anything along the way, just reply to this email.</p>` +
        cta("Claim your spins", "#1a73e8") +
        `<p>Best regards,<br>The RocketSpin Team</p>` +
        footer("4587 Granville Avenue, Office 312, Vancouver, BC V6H 3K9, Canada"),
    ),
    text: `Hey \${name},

Your RocketSpin account is now active, and you can explore the platform whenever you're ready. When you log in, you may notice additional access up to 100 rounds.

Everything on the platform is designed for entertainment purposes and to help you enjoy the experience at your own pace.

If you need help with anything along the way, just reply to this email.

Claim your spins

Best regards,
The RocketSpin Team

4587 Granville Avenue, Office 312, Vancouver, BC V6H 3K9, Canada
Unsubscribe`,
  },

  {
    seed_key: "pre-approved-fun500",
    name: "Pre-Approved Credits — FUN500",
    brand: "Account Manager",
    locale: "en",
    html: wrap(
      `<p>Hi \${name},</p>` +
        `<p>We're glad to tell you that your credits were pre-approved.</p>` +
        `<p>Finish the process and it will be automatically applied to your account. Remember to use the code <strong style="color:#1a73e8;">FUN500</strong> when you top up.</p>` +
        cta("LET'S GO", "#c8881d") +
        `<p>We're glad to have you onboard with us.<br>Enjoy the weekend,</p>` +
        `<p>David,<br>Your account manager</p>` +
        footer("4587 Granville Avenue, Office 312, Vancouver, BC V6H 3K9, Australia"),
    ),
    text: `Hi \${name},

We're glad to tell you that your credits were pre-approved.

Finish the process and it will be automatically applied to your account. Remember to use the code FUN500 when you top up.

LET'S GO

We're glad to have you onboard with us.
Enjoy the weekend,

David,
Your account manager

4587 Granville Avenue, Office 312, Vancouver, BC V6H 3K9, Australia
In order to unsubscribe from this mailing list, please click here: Unsubscribe`,
  },
];
