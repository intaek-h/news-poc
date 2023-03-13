require("dotenv").config();

const axios = require("axios");
const express = require("express");
const app = express();
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");

app.get("/sources", async (req, res) => {
  const NEWS_API_PUBLISHERS =
    "https://newsapi.org/v2/top-headlines/sources?category=business&language=en&country=us&apiKey=59f1279c47cd4095bf5fb4cd1033561a";

  try {
    const { data: news } = await axios(NEWS_API_PUBLISHERS);

    res.json(news);
  } catch (error) {
    res.send(error);
  }
});

app.get("/everything", async (req, res) => {
  const NEWS_API_EVERYTHING =
    "https://newsapi.org/v2/everything?domains=techcrunch.com&pageSize=10&apiKey=59f1279c47cd4095bf5fb4cd1033561a";

  try {
    const { data: news } = await axios(NEWS_API_EVERYTHING);

    res.json(news);
  } catch (error) {
    res.send(error);
  }
});

app.get("/", async (req, res) => {
  // const NEWS_API_HEADLINES = 'https://newsapi.org/v2/top-headlines?sources=the-wall-street-journal&apiKey=59f1279c47cd4095bf5fb4cd1033561a'
  const NEWS_API_HEADLINES =
    "https://newsapi.org/v2/everything?domains=techcrunch.com&pageSize=10&apiKey=59f1279c47cd4095bf5fb4cd1033561a";

  try {
    // News API 에서 현재 시간대의 헤드라인 뉴스를 가져옵니다.
    const { data: news } = await axios(NEWS_API_HEADLINES);

    // News API 가 뉴스 기사 내용을 전부 보내주지 않기 때문에 각 뉴스 기사의 URL 에 요청을 보내 기사의 HTML 을 가져옵니다.
    // https://newsapi.org/docs/guides/how-to-get-the-full-content-for-a-news-article
    const siteRequests = news.articles.map((article) => axios.get(article.url));
    const htmls = await Promise.allSettled(siteRequests);

    // 가져온 HTML 을 파싱하여 읽기 쉬운 형태로 변환합니다.
    const readableArticles = htmls.map((html) => {
      // HTML 문자열을 DOM 형태로 변환합니다.
      const dom = new JSDOM(html.value.data);

      // DOM 을 파싱하여 읽기 쉬운 형태로 변환합니다.
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      return article;
    });

    // 각 기사의 HTML 문자열을 담은 배열입니다. 요청에 실패한 경우가 있기 때문에 빈 객체가 들어갈 수 있습니다.
    const articlesInHtml = readableArticles.map(
      (article) => article?.content || "<h1>___none___</h1>"
    );

    // 각 기사의 정보를 정형화된 객체에 담아 내려줍니다.
    const parsedData = readableArticles.map((article) => ({
      title: article?.title || "",
      author: article?.byline || "",
      content: article?.textContent || "",
      length: article?.length || "",
      site: article?.siteName || "",
      excerpt: article?.excerpt || "",
    }));

    res.json({ newsApi: news.articles, parsedData });
  } catch (error) {
    res.send(error);
  }
});

app.listen(3000, () => {
  console.log("on 3000");
});
