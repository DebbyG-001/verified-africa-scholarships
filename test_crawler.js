import { CheerioCrawler } from '@crawlee/cheerio';

const crawler = new CheerioCrawler({
    async requestHandler({ request, $, log }) {
        log.info(request.url);
        // Print all anchor tags that look like scholarships
        const links = [];
        $('a').each((i, el) => {
            links.push({
                text: $(el).text().trim(),
                href: $(el).attr('href')
            });
        });
        console.log(links.slice(0, 20)); // Print first 20 links
    },
});

await crawler.run(['https://scholarsworld.ng/']);
