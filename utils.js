const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const axios = require("axios");

/**
 * News API 에서 뉴스 url 배열을 받아, 해당 url 에 요청을 보내 읽기 쉬운 형태로 변환합니다.
 * @param {String} url
 */
exports.getNewsAricles = async (url) => {
  try {
    // News API 에서 현재 시간대의 헤드라인 뉴스를 가져옵니다.
    const { data: news } = await axios(url);

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

    // 각 기사의 정보를 정형화된 객체에 담아 내려줍니다.
    const parsedData = readableArticles.map((article) => ({
      title: article?.title || "",
      author: article?.byline || "",
      content: article?.textContent || "",
      length: article?.length || "",
      site: article?.siteName || "",
      excerpt: article?.excerpt || "",
      // 기사의 길이가 1000자 이상 6000자 이하인 경우에만 요약합니다.
      isUseful:
        !!article &&
        article.textContent.length > 3000 &&
        article.textContent.length < 12000,
    }));

    return { newsApi: news.articles, parsedData };
  } catch (error) {
    console.error("getNewsAricles error: ", error);
    return { newsApi: [], parsedData: [] };
  }
};

/**
 *
 * @param {Array} articles
 */
exports.processArticles = (articles) =>
  articles.filter((article) => article.isUseful);

/**
 * @param {Array} articles
 */
exports.summarize = async (openai, articles) => {
  try {
    const summaryRequests = articles.map((article) =>
      openai.createCompletion({
        model: "text-curie-001",
        prompt: article.content + "\n\nTl;dr",
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      })
    );

    const summaries = await Promise.allSettled(summaryRequests);

    // content, usage 가 안잡히고 있음. 확인 필요
    const summaryData = summaries.map((summary, index) => ({
      title: articles[index].title,
      author: articles[index].author,
      content: summary.value?.data.choices,
      usage: summary.value?.data.usage,
    }));

    return summaryData;
  } catch (error) {
    console.error(error);
    return [];
  }
};
