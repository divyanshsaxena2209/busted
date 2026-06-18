const dotenv = require('dotenv');
dotenv.config();

const SEARCH_QUERY = 'India AND (traffic OR accident OR highway OR expressway OR toll OR RTO OR challan)';

async function test() {
  const nKey = process.env.NEWS_API_KEY;
  const gKey = process.env.GNEWS_API_KEY;

  if (nKey) {
    const res = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(SEARCH_QUERY)}&language=en&pageSize=10&sortBy=publishedAt&apiKey=${nKey}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    console.log('NewsAPI Status:', res.status);
    if (!res.ok) console.log(await res.text());
  }
  
  if (gKey) {
    const res = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(SEARCH_QUERY)}&lang=en&country=in&max=10&sortby=publishedAt&apikey=${gKey}`);
    console.log('GNews Status:', res.status);
    if (!res.ok) console.log(await res.text());
  }
}
test();
