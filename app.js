require("dotenv").config();

const axios = require("axios");
const express = require("express");
const app = express();
const { getNewsAricles, processArticles, summarize } = require("./utils");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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
  const NEWS_API_HEADLINES =
    "https://newsapi.org/v2/top-headlines?sources=fortune&pageSize=1&apiKey=59f1279c47cd4095bf5fb4cd1033561a";
  // const NEWS_API_HEADLINES =
  //   "https://newsapi.org/v2/everything?domains=techcrunch.com&pageSize=2&apiKey=59f1279c47cd4095bf5fb4cd1033561a";

  const { parsedData } = await getNewsAricles(NEWS_API_HEADLINES);

  const usefulArticles = processArticles(parsedData);

  const summaries = await summarize(openai, usefulArticles);

  res.json({ data: summaries });
});

app.listen(3000, () => {
  console.log("on 3000");
});
