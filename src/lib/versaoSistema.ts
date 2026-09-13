/**
 * VERSÃO DO SISTEMA E AVISO DE ATUALIZAÇÃO
 *
 * O número de versão vem do Git: a quantidade de atualizações no histórico.
 * O painel mostra SYSTEM_VERSION_BASE + esse número (ex.: 1.2.150), então a
 * versão sobe sozinha a cada atualização, sem ninguém precisar trocar texto.
 *
 * Para saber se há versão nova, o servidor baixa as referências do GitHub
 * (`git fetch`, sem alterar nada no código em uso) e compara com o que está
 * rodando. A lista do que mudou são os títulos das atualizações.
 *
 * O Git roda proibido de pedir senha. Sem isso, com repositório privado e sem
 * credencial, ele ficaria parado esperando alguém digitar — num servidor onde
 * ninguém está olhando.
 */
import { execFile } from 'node:child_process';

export interface InfoVersao {
  hash: string;
  curto: string;
  data: string;     // ISO
  numero: number;   // quantidade de atualizações no histórico
  titulo: string;
}

export interface StatusAtualizacao {
  atual: InfoVersao | null;
  maisRecente: InfoVersao | null;
  atras: number;
  mudancas: { curto: string; data: string; titulo: string }[];
  verificadoEm: string;
  erro?: string;
}

const AMBIENTE_GIT = {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',   // nunca pedir usuário/senha no terminal
  GCM_INTERACTIVE: 'never',   // nem abrir janela do gerenciador de credenciais
};

function git(cwd: string, args: string[], timeout = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, env: AMBIENTE_GIT, timeout, windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(String(stderr || err.message).trim()));
        resolve(String(stdout).trim());
      });
  });
}

const SEP = '\x1f';

async function lerVersao(cwd: string, ref: string): Promise<InfoVersao> {
  const [linha, numero] = await Promise.all([
    git(cwd, ['log', '-1', `--format=%H${SEP}%h${SEP}%cI${SEP}%s`, ref]),
    git(cwd, ['rev-list', '--count', ref]),
  ]);
  const [hash, curto, data, titulo] = linha.split(SEP);
  return { hash, curto, data, numero: Number(numero), titulo };
}

function explicarErro(msg: string): string {
  if (/authentication|could not read username|terminal prompts disabled|permission denied|repository not found|\b40[13]\b/i.test(msg)) {
    return 'O servidor não conseguiu acessar o repositório no GitHub. Se ele for privado, é preciso cadastrar uma credencial de acesso.';
  }
  if (/could not resolve host|timed out|timeout|unable to access|network|connection/i.test(msg)) {
    return 'Sem conexão com o GitHub no momento. Tente verificar de novo em alguns minutos.';
  }
  return 'Não foi possível verificar atualizações agora.';
}

// Resultado guardado por 15 minutos, por pasta. E uma verificação por vez:
// dois `git fetch` simultâneos na mesma pasta brigam pelo mesmo arquivo de trava.
const VALIDADE_MS = 15 * 60 * 1000;
const guardados = new Map<string, { quando: number; valor: StatusAtualizacao }>();
const emAndamento = new Map<string, Promise<StatusAtualizacao>>();

export function statusAtualizacao(cwd: string = process.cwd(), forcar = false): Promise<StatusAtualizacao> {
  const guardado = guardados.get(cwd);
  if (!forcar && guardado && Date.now() - guardado.quando < VALIDADE_MS) return Promise.resolve(guardado.valor);
  const rodando = emAndamento.get(cwd);
  if (rodando) return rodando;

  const tarefa = (async (): Promise<StatusAtualizacao> => {
    let erro: string | undefined;
    try {
      await git(cwd, ['fetch', 'origin', 'main', '--quiet'], 25000);
    } catch (e: any) {
      erro = explicarErro(e.message);
    }

    let atual: InfoVersao | null = null;
    let maisRecente: InfoVersao | null = null;
    let atras = 0;
    let mudancas: StatusAtualizacao['mudancas'] = [];

    try { atual = await lerVersao(cwd, 'HEAD'); }
    catch { erro = erro || 'Não foi possível ler a versão em uso.'; }

    try {
      maisRecente = await lerVersao(cwd, 'origin/main');
      atras = Number(await git(cwd, ['rev-list', '--count', 'HEAD..origin/main']));
      if (atras > 0) {
        const log = await git(cwd, ['log', '-n', '30', `--format=%h${SEP}%cI${SEP}%s`, 'HEAD..origin/main']);
        mudancas = log.split('\n').filter(Boolean).map(l => {
          const [curto, data, titulo] = l.split(SEP);
          return { curto, data, titulo };
        });
      }
    } catch {
      // origin/main nunca foi baixado: não há com o que comparar
      erro = erro || 'Ainda não foi possível consultar o repositório.';
    }

    const valor: StatusAtualizacao = { atual, maisRecente, atras, mudancas, verificadoEm: new Date().toISOString(), ...(erro ? { erro } : {}) };
    guardados.set(cwd, { quando: Date.now(), valor });
    return valor;
  })();

  emAndamento.set(cwd, tarefa);
  tarefa.finally(() => emAndamento.delete(cwd));
  return tarefa;
}
