// Valida conteudo/ fora do app. Uso: npm run conteudo:validar (Node 22.18+).
import { lerConteudo } from './ler-conteudo.mts';

const { erros, categorias, totalArquivos } = lerConteudo();

if (erros.length) {
  console.error(`✖ ${erros.length} problema(s):\n- ${erros.join('\n- ')}`);
  process.exit(1);
}
console.log(`✔ ${categorias.length} categoria(s) e ${totalArquivos} guia(s) válidos.`);
