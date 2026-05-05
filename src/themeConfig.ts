/**
 * CONFIGURAÇÃO VISUAL DO APLICATIVO
 * 
 * Altere os valores abaixo para personalizar o app rapidamente.
 */

export const APP_CONFIG = {
  name: "Igreja Renovar",
  shortName: "Renovar",
  description: "Conectando pessoas através da fé e do amor.",
  
  // URL das Imagens (Você pode trocar pelos seus links)
  logos: {
    dark: "https://images.unsplash.com/photo-1544427928-c49cdfebf4ad?q=80&w=200&h=200&auto=format&fit=crop", // Logo para fundos claros
    light: "https://images.unsplash.com/photo-1544427928-c49cdfebf4ad?q=80&w=200&h=200&auto=format&fit=crop", // Logo para fundos escuros
    icon: "https://images.unsplash.com/photo-1544427928-c49cdfebf4ad?q=80&w=100&h=100&auto=format&fit=crop", // Ícone circular
  },
  
  // Cores Principais (Use códigos Hexadecimal)
  theme: {
    primary: "#f59e0b", // Amber 500 (Principal)
    secondary: "#1e293b", // Slate 800 (Textos/Navegação)
    accent: "#f43f5e", // Rose 500 (Destaques)
  },

  // ----------------------------------------------------
  // Configurações Técnicas & Servidor
  // ----------------------------------------------------
  //
  // >>> 1. PARA TESTAR NO COMPUTADOR MODO WEB:
  // Se você rodar `npm run dev` no computador e acessar pelo navegador, 
  // pode deixar qualquer link aqui, o app web vai ignorar e se conectar sozinho.
  // 
  // >>> 2. PARA TESTAR O APLICATIVO ANDROID NO SEU WIFI:
  // Se você for compilar o APK só para testar no celular enquanto seu 
  // computador roda o servidor (`npm run dev`), você precisa colocar o IP local
  // da sua máquina com a porta 3000. 
  // Exemplo: apiUrl: "http://192.168.0.15:3000"
  // (Abra o terminal no PC, digite 'ipconfig' no Windows ou 'ifconfig' no Mac e busque IPv4)
  //
  // >>> 3. PARA LANÇAR O APLICATIVO OFICIAL:
  // Coloque o seu domínio da Cloudflare ou da hospedagem final, SEM A PORTA.
  // Exemplo: apiUrl: "https://app.suaigreja.com.br"
  
  apiUrl: "https://ais-dev-ejrcrjdyz4gr7xmdtfczzs-125365002112.us-east5.run.app", // Altere aqui seguindo as regras acima


  // Redes Sociais
  social: {
    instagram: "https://instagram.com/igrejarenovar",
    youtube: "https://youtube.com/igrejarenovar",
    whatsapp: "5511999999999",
  }
};
