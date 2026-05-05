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

  // Configurações Técnicas
  apiUrl: "https://ais-dev-ejrcrjdyz4gr7xmdtfczzs-125365002112.us-east5.run.app", // Altere para sua URL de produção após deploy

  // Redes Sociais
  social: {
    instagram: "https://instagram.com/igrejarenovar",
    youtube: "https://youtube.com/igrejarenovar",
    whatsapp: "5511999999999",
  }
};
