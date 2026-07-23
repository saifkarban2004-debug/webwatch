import { prisma } from './src/lib/prisma';

async function main() {
  const m = await prisma.movie.findFirst({
    include: { genres: { include: { genre: true } } }
  });
  console.log("MOVIE GENRES:", m?.genres);
  
  const s = await prisma.tVShow.findFirst({
    include: { genres: { include: { genre: true } } }
  });
  console.log("TV GENRES:", s?.genres);
}

main().finally(() => prisma.$disconnect());
