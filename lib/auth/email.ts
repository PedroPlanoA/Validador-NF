import "server-only";
import nodemailer from "nodemailer";

/**
 * Envio do código por SMTP do Google Workspace.
 *
 * Exige `SMTP_USER` (uma conta do escritório) e `SMTP_PASSWORD` — que precisa
 * ser uma **senha de app** do Google, não a senha da conta: o Google recusa a
 * senha normal em SMTP desde que a verificação em duas etapas passou a ser
 * obrigatória.
 *
 * O remetente é a própria conta: o Gmail reescreve o `From` para o dono da
 * autenticação de qualquer forma, então anunciar outro endereço só serviria
 * para o e-mail parecer falsificado e cair em spam.
 */

const HOST = "smtp.gmail.com";
const PORTA = 465;

function transporte() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!user || !pass) {
    throw new Error("SMTP_USER e SMTP_PASSWORD precisam estar configurados para enviar o código.");
  }

  return nodemailer.createTransport({
    host: HOST,
    port: PORTA,
    secure: true, // 465 é TLS direto, sem STARTTLS.
    auth: { user, pass },
  });
}

export async function enviarCodigo(para: string, codigo: string): Promise<void> {
  const remetente = process.env.SMTP_USER!;

  // Assunto com o código: quem usa celular vê na notificação e nem abre o
  // e-mail. É um segredo de 10 minutos, não uma senha.
  await transporte().sendMail({
    from: `"Hub Fiscal — Plano A" <${remetente}>`,
    to: para,
    subject: `${codigo} é o seu código de acesso ao Hub Fiscal`,
    text: [
      `Seu código de acesso ao Hub Fiscal é ${codigo}.`,
      "",
      "Ele vale por 10 minutos e só pode ser usado uma vez.",
      "",
      "Se não foi você que pediu, ignore este e-mail e avise o administrador.",
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#F4F1EA;padding:32px">
        <div style="max-width:440px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;
                    box-shadow:0 8px 20px -10px rgba(0,50,60,.25)">
          <div style="background:#00323C;padding:22px 28px">
            <span style="color:#7BD8C8;font-size:11px;font-weight:700;letter-spacing:.24em;
                         text-transform:uppercase">Plano A Contabilidade</span>
            <div style="color:#fff;font-size:18px;font-weight:700;margin-top:4px">Hub Fiscal</div>
          </div>
          <div style="padding:28px">
            <p style="margin:0 0 18px;color:#4a4a4a;font-size:15px">Seu código de acesso:</p>
            <div style="font-size:34px;font-weight:800;letter-spacing:.24em;color:#00323C;
                        background:#ECE7DC;border-radius:12px;padding:16px;text-align:center">${codigo}</div>
            <p style="margin:18px 0 0;color:#7a7a7a;font-size:13px;line-height:1.6">
              Vale por 10 minutos e só pode ser usado uma vez.<br>
              Se não foi você que pediu, ignore este e-mail e avise o administrador.
            </p>
          </div>
        </div>
      </div>`,
  });
}
