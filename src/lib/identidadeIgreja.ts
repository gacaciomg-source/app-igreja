/**
 * IDENTIDADE DA IGREJA — o que muda de uma igreja para outra
 *
 * Cada igreja roda numa instalação separada (pasta, .env e domínio próprios).
 * Tudo que identifica a igreja vem da Personalização do painel, gravado em
 * config/appearance — nunca fixo no código:
 *  - nome, nome curto (embaixo do ícone no celular) e título das notificações;
 *  - ícone do app instalado pelo navegador;
 *  - dados da Política de Privacidade (LGPD): controlador, CNPJ, contato...
 *
 * Aqui o servidor monta, com esses dados, o título da aba (index.html) e o
 * manifesto de instalação (manifest.json).
 */

export interface DadosPrivacidade {
  controlador?: string;
  cnpj?: string;
  natureza?: string;
  endereco?: string;
  email?: string;
  encarregado?: string;
}

export interface Identidade {
  nome: string;
  nomeCurto: string;
  tituloNotificacoes: string;
  iconeApp?: string;
  privacidade: DadosPrivacidade;
}

// Dados que já estavam na política da Igreja Renovar. Valem só para ela, e só
// enquanto os campos não forem preenchidos no painel — a Play Store exige que
// a página de privacidade continue completa depois desta atualização.
const PRIVACIDADE_RENOVAR: DadosPrivacidade = {
  controlador: 'Igreja Renovar',
  cnpj: '52.966.563/0001-32',
  natureza: 'Organização Religiosa (322-0)',
  endereco: 'Avenida Coração de Estudante, 10 — Moradas da Lapinha, Lagoa Santa/MG — CEP 33.231-568',
  email: 'igrejarenovaroficial@gmail.com',
  encarregado: 'Gustavo Acácio dos Santos',
};

const NOME_PADRAO = 'Igreja';

export function identidadeDe(appearance: any): Identidade {
  const a = appearance || {};
  const nome = String(a.churchName || '').trim() || NOME_PADRAO;
  const salvos: DadosPrivacidade = a.privacidade || {};
  const preenchido = Object.values(salvos).some(v => String(v || '').trim());
  const base = !preenchido && /renovar/i.test(nome) ? PRIVACIDADE_RENOVAR : {};
  return {
    nome,
    nomeCurto: String(a.churchShortName || '').trim() || nome,
    tituloNotificacoes: String(a.notificationTitle || '').trim() || nome,
    iconeApp: a.appIconUrl || undefined,
    privacidade: { controlador: nome, ...base, ...Object.fromEntries(Object.entries(salvos).filter(([, v]) => String(v || '').trim())) },
  };
}

const escapar = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Troca nome e ícone no index.html antes de entregar ao navegador. */
export function montarIndex(html: string, id: Identidade): string {
  let saida = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapar(id.nome)}</title>`)
    .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/, `$1${escapar(id.nomeCurto)}$2`)
    .replace(/(<meta name="application-name" content=")[^"]*(")/, `$1${escapar(id.nome)}$2`);
  if (id.iconeApp) {
    saida = saida.replace(/(<link rel="apple-touch-icon" href=")[^"]*(")/, `$1${escapar(id.iconeApp)}$2`);
  }
  return saida;
}

/** Manifesto de instalação (PWA) com o nome e o ícone desta igreja. */
export function montarManifesto(base: any, id: Identidade): any {
  const m = { ...base, name: id.nome, short_name: id.nomeCurto };
  if (id.iconeApp) {
    // Um único PNG quadrado serve para todos os tamanhos: o navegador redimensiona.
    m.icons = [
      { src: id.iconeApp, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: id.iconeApp, sizes: '192x192', type: 'image/png', purpose: 'any' },
    ];
  }
  return m;
}
