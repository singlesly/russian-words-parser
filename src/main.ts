import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as HTMLParser from "node-html-parser";
import { HttpService, INestApplicationContext } from "@nestjs/common";
import * as path from "path";
import * as fs from "fs";

(async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();
  await count();
})();

async function count(): Promise<void> {
  const words: string[] = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "words.json")).toString());
  console.log('Количество слов', words.length.toLocaleString());
  type Stats = {
    // тся
    tsya: number,
    // ться
    tsia: number,
  };
  const stats: Stats = {tsia: 0, tsya: 0};
  for(const word of words) {
    if(word.match(/ться/g)) {
      stats.tsia++;
      continue;
    }
    if(word.match(/тся/g)) {
      stats.tsya++;
      continue;
    }
  }
  console.log("Слова с ться", stats.tsia.toLocaleString());
  console.log("Слова с тся", stats.tsya.toLocaleString());
  fs.writeFileSync(path.join(__dirname, "..", "stats.json"), JSON.stringify(stats, null, 2));
}

async function parsing(app: INestApplicationContext): Promise<void> {
  const http = app.get(HttpService);
  const pages: URL[] = await getPages(http);
  const words: string[] = [];
  for(const page of pages) {
    const root = await HTMLParse(http, page.toString());
    root.querySelectorAll("ul.list-unstyled li a").forEach(item => words.push(item.innerText));

    console.log('page is', page.toString());
  }
  fs.writeFileSync(path.join(__dirname, "..", "words.json"), JSON.stringify(words));
}

async function HTMLParse(http: HttpService, url: string) {
  const response = await http.get(url).toPromise();
  return HTMLParser.parse(response.data);
}

async function getPages(http: HttpService): Promise<URL[]> {
  const url = new URL("/", "https://wordsonline.ru");
  const response = await http.get(url.toString()).toPromise()
  const root = HTMLParser.parse(response.data);
  const alphabet: URL[] = root.querySelector(".alphabet").querySelectorAll("a").map(item => new URL(item.getAttribute("href"), url.toString()));
  const pages: URL[] = [];
  for (const letter of alphabet) {
    const response = await http.get(letter.toString()).toPromise();
    const root = HTMLParser.parse(response.data);
    const pagination = root.querySelector(".pagination");
    if(!pagination) {
      pages.push(letter);
      continue;
    }
    const maxPage = Number(pagination.lastChild.innerText);
    for(let i = 1; i <= maxPage; i++) {
      const url = new URL("", letter.toString());
      url.searchParams.append("page", i.toString());
      pages.push(url);
    }
  }
  return pages;
}
