/**
 * Gera o ícone monocromático da barra de status (ic_stat_igreja).
 *
 * POR QUE ESTE SCRIPT EXISTE
 * O `capacitor-assets` gera ícone do app e splash, mas NÃO gera o ícone de
 * notificação. O Android exige ali uma silhueta branca sobre transparente —
 * se apontar para a logo colorida, ele achata tudo num quadrado branco.
 *
 * Sem este script, o ic_stat_igreja só existiria porque a pasta android/ está
 * versionada. Quem apagasse a plataforma e rodasse `cap add` de novo ficaria
 * com o quadrado branco e sem pista do motivo.
 *
 * A fonte é resources/icon.png, ou seja: o repositório se basta.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const FONTE = 'resources/icon.png';
const DESTINO = 'android/app/src/main/res';
const DENSIDADES = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };

// Acima deste brilho o pixel vira branco opaco; abaixo, transparente.
// 170 mantém as folhas brancas e o tronco, e descarta o anel dourado — que
// em 24px viraria só sujeira em volta do desenho.
const LIMIAR = 170;

const { data } = await sharp(FONTE).resize(512, 512).ensureAlpha()
  .raw().toBuffer({ resolveWithObject: true });

const silhueta = Buffer.alloc(512 * 512 * 4);
for (let i = 0; i < 512 * 512; i++) {
  const brilho = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  silhueta[i * 4] = 255;
  silhueta[i * 4 + 1] = 255;
  silhueta[i * 4 + 2] = 255;
  silhueta[i * 4 + 3] = brilho > LIMIAR ? 255 : 0;
}

const png = await sharp(silhueta, { raw: { width: 512, height: 512, channels: 4 } })
  .png().toBuffer();
const recortada = await sharp(png).trim().png().toBuffer();

for (const [densidade, lado] of Object.entries(DENSIDADES)) {
  const pasta = `${DESTINO}/drawable-${densidade}`;
  mkdirSync(pasta, { recursive: true });

  // 85% do quadro: o guia do Android pede respiro em volta do desenho.
  const arte = await sharp(recortada)
    .resize(Math.round(lado * 0.85), Math.round(lado * 0.85),
            { fit: 'inside', kernel: 'lanczos3' })
    .png().toBuffer();

  await sharp({ create: { width: lado, height: lado, channels: 4,
                          background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: arte, gravity: 'center' }])
    .png().toFile(`${pasta}/ic_stat_igreja.png`);

  console.log(`  drawable-${densidade.padEnd(8)} ic_stat_igreja.png  ${lado}x${lado}`);
}

console.log('Ícone de notificação gerado a partir de ' + FONTE);

/**
 * Reaplica a correção do ícone adaptativo.
 *
 * O `capacitor-assets` gera o XML aplicando inset de 16.7% nas DUAS camadas.
 * No fundo isso está errado: sendo cor sólida, ele fica menor que a máscara do
 * launcher e sobra canto transparente. O inset só faz sentido no primeiro
 * plano, onde serve para respeitar a zona segura de 72dp.
 *
 * Como o gerador sobrescreve esses arquivos toda vez, a correção mora aqui —
 * assim `npm run assets` sai sempre correto, sem depender de alguém lembrar.
 */
import { writeFileSync } from 'node:fs';

const ADAPTATIVO = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Fundo sem inset: a cor solida precisa cobrir os 108dp inteiros, senao
         o launcher mostra canto transparente ao aplicar a mascara. -->
    <background android:drawable="@mipmap/ic_launcher_background" />
    <!-- Primeiro plano com inset de 16.7%: mantem a arte dentro da zona
         segura de 72dp exigida pelo Android. -->
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
`;

for (const nome of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  writeFileSync(`${DESTINO}/mipmap-anydpi-v26/${nome}`, ADAPTATIVO);
  console.log(`  mipmap-anydpi-v26/${nome}  (fundo sem inset)`);
}
