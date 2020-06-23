// https://www.alignable.com/margate-fl/directory/recent
const fs = require("fs");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const axios = require("axios");

function extractItems() {
  const bizOwnerName = document.querySelectorAll(".biz-listing__owner");
  const bizName = document.querySelectorAll(".biz-listing__business-name");
  const links = document.querySelectorAll(".biz-listing__owner-wrapper");

  const items = [];

  for (let i = 0; i < bizOwnerName.length; i++) {
    let cleanedLink = `https://www.alignable.com${links[i].attributes.href.value}`;
    let item = {
      ownerName: bizOwnerName[i].innerText || "n/a",
      bizName: bizName[i].innerText || "n/a",
      link: cleanedLink || "n/a",
    };

    items.push(item);
  }

  return items;
}

async function scrapeItemsforInfo(items, page) {
  const rawDate = new Date().toString().split(" ");
  const date = `${rawDate[1]}-${rawDate[2]}-${rawDate[3]}`;
  const writeStream = fs.createWriteStream(`Alignable-${date}.txt`);
  const pathName = writeStream.path;

  let links = items.map((each) => each.link);
  //   let newItems = [];

  for (let i = 0; i < links.length; i++) {
    await page.goto(links[i]);
    const html = await page.content();
    const $ = cheerio.load(html);

    try {
      let phone = $(".profile-info__item")
        .text()
        .split("(")[1]
        .split("V")[0]
        .trim();
      // find the info
      items[i].phoneNumber = `(${phone}`;
    } catch (e) {}

    let item = {
      link: items[i].link || "N/A",
      ownerName: items[i].ownerName || "N/A",
      bizName: items[i].bizName || "N/A",
      phoneNumber: items[i].phoneNumber || "N/A",
    };

    console.log(item);

    writeStream.write(
      `${item.link} ~ ${item.bizName} ~ ${item.ownerName} ~ ${item.phoneNumber}\n`
    );
    // newItems.push(items[i]);
  }
}

async function scrapeInfiniteScrollItems(
  page,
  extractItems,
  itemTargetCount,
  scrollDelay = 1000
) {
  let items = [];
  try {
    let previousHeight;
    while (items.length < itemTargetCount) {
      items = await page.evaluate(extractItems);
      previousHeight = await page.evaluate("document.body.scrollHeight");
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitForFunction(
        `document.body.scrollHeight > ${previousHeight}`
      );
      await page.waitFor(scrollDelay);
    }
  } catch (e) {}
  return items;
}

async function main(city, state) {
  // Set up browser and page.
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setViewport({
    width: 1280,
    height: 926,
  });

  // Navigate to the main page.
  await page.goto(
    `https://www.alignable.com/${city}-${state}/directory/recent`
  );

  // Scroll and extract items from the page.
  const items = await scrapeInfiniteScrollItems(page, extractItems, 1000);

  //Scrape info from each item
  const results = await scrapeItemsforInfo(items, page);

  // Close the browser.
  await browser.close();
  // close the stream
  await writeStream.end();
}

main("houston", "tx");
