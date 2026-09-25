import { createCheerioRouter } from '@crawlee/cheerio';
import { Actor } from 'apify';

export const router = createCheerioRouter();

// URL patterns that are never individual scholarship pages — nav, category,
// and utility pages on scholarsworld.ng and similar sites.
const NON_SCHOLARSHIP_PATH_PATTERNS = [
    '/contact', '/about', '/privacy', '/terms', '/disclaimer',
    '/blogs', '/blog/', '/grant/', '/internship', '/closing-soon',
    '/watch', '/category/', '/tag/', '/page/', '/all-scholarships',
    '/scholarships-in-', '/undergraduate-scholarship', '/masters-scholarship',
    '/phd-scholarship',
];

router.addDefaultHandler(async ({ enqueueLinks, request, $, log, pushData }) => {
    log.info(`Processing ${request.url}...`);

    // --- Fix 1: scope heading search to the main content area only, not the
    // whole page (which includes sidebar/nav text that can contain words like
    // "eligibility" as a filter label and cause false positives). Fall back to
    // 'body' only if no obvious content container exists, but still require a
    // second real signal (an apply link) before treating the page as a detail
    // page — belt and suspenders against sitewide widget text.
    const $content = $('article, .entry-content, .post-content, main').first();
    const $scope = $content.length ? $content : $('body');

    const headingText = $scope.find('h1, h2, h3, h4').text().toLowerCase();
    const hasSignalHeading = headingText.includes('requirement')
        || headingText.includes('how to apply')
        || headingText.includes('eligibility');

    const hasApplyLink = $scope.find('a').filter((_, el) => {
        const t = $(el).text().toLowerCase();
        return t.includes('apply now') || t.includes('apply here') || t.includes('official website');
    }).length > 0;

    const isDetail = hasSignalHeading && hasApplyLink;

    if (isDetail) {
        log.info(`Found scholarship detail page: ${request.url}`);

        const title = $('h1').first().text().trim() || $('title').text().replace('- Scholars World', '').trim();

        // --- Fix 2: only accept a provider value if the matched line actually
        // looks like a "Label: Value" pair. If there's no colon, the line is
        // almost certainly unrelated body text (e.g. an eligibility bullet
        // that happens to mention "University") — skip it rather than using
        // the whole sentence.
        let provider = 'Unknown Provider';
        const hostCandidate = $scope.find('li, p').filter((_, el) => {
            const t = $(el).text();
            return /^(host|university|organization|organisation|provider|offered by)\s*[:\-]/i.test(t.trim());
        }).first().text();
        if (hostCandidate) {
            const parts = hostCandidate.split(/[:\-]/);
            if (parts.length > 1) {
                provider = parts.slice(1).join(':').trim();
            }
        }

        // Deadline
        let deadline = 'Check official website';
        const deadlineText = $scope.find('li, p').filter((_, el) => /deadline/i.test($(el).text())).first().text();
        if (deadlineText) {
            const parts = deadlineText.split(/deadline/i);
            if (parts.length > 1) deadline = parts[1].replace(/[:]/g, '').trim().split('\n')[0];
        }

        // Eligibility
        let eligibility = [];
        const eligibilityHeading = $scope.find('h1, h2, h3, h4, h5').filter((_, el) => {
            const t = $(el).text().toLowerCase();
            return t.includes('eligibility') || t.includes('requirement');
        }).first();
        if (eligibilityHeading.length > 0) {
            const list = eligibilityHeading.nextUntil('h1, h2, h3, h4, h5', 'ul, ol').first();
            list.find('li').each((_, el) => {
                eligibility.push($(el).text().trim());
            });
        }

        // Required Documents
        let requiredDocuments = [];
        const docsHeading = $scope.find('h1, h2, h3, h4, h5').filter((_, el) => {
            return $(el).text().toLowerCase().includes('document');
        }).first();
        if (docsHeading.length > 0) {
            const list = docsHeading.nextUntil('h1, h2, h3, h4, h5', 'ul, ol').first();
            list.find('li').each((_, el) => {
                requiredDocuments.push($(el).text().trim());
            });
        }

        // Apply Link
        let applyLink = '';
        $scope.find('a').each((_, el) => {
            const text = $(el).text().toLowerCase();
            if (text.includes('apply now') || text.includes('apply here') || text.includes('official website')) {
                applyLink = $(el).attr('href');
            }
        });

        // Trust logic (unchanged)
        const { trustedDomains = [] } = (await Actor.getInput()) ?? {};
        let domainTrusted = false;
        if (applyLink && trustedDomains.length > 0) {
            domainTrusted = trustedDomains.some(domain => applyLink.toLowerCase().includes(domain.toLowerCase()));
        } else if (trustedDomains.length === 0) {
            domainTrusted = true;
        }
        const infoComplete = eligibility.length >= 3 && requiredDocuments.length >= 3;
        const isTrusted = domainTrusted || infoComplete;

        await pushData({
            title,
            provider,
            deadline,
            eligibility,
            requiredDocuments,
            applyLink,
            isTrusted,
            sourceUrl: request.loadedUrl,
        });
    }

    // --- Fix 3: skip known non-scholarship paths so they're never even
    // visited, instead of relying only on the isDetail check to filter them.
    await enqueueLinks({
        strategy: 'same-domain',
        transformRequestFunction(req) {
            if (NON_SCHOLARSHIP_PATH_PATTERNS.some((p) => req.url.includes(p))) {
                return false;
            }
            return req;
        },
    });
});