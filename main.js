const { chromium } = require('playwright');
const iconv = require('iconv-lite');
const jschardet = require('jschardet');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = './novel.db';

const db = new Database(dbPath);

db.prepare(`
    CREATE TABLE IF NOT EXISTS novels (
        tid INTEGER PRIMARY KEY,
        title TEXT,
        content TEXT
    )
`).run();

(async () => {
    const domain = 'ac1ss.ascwefkjw.com'
    const baseUrl = 'https://ac1ss.ascwefkjw.com/'
    const mobileTXTPath = 'forum.php?mod=forumdisplay&fid=72'

    const browser = await chromium.launch({
        headless: true,
        proxy: {
            server: "http://127.0.0.1:7890"
        }
    });
    const context = await browser.newContext();
    const cookieString = `PHPSESSID=fehap6pvv43kuu7r4foskqi2dp; yj0M_5a0c_saltkey=FEBk1Iww; yj0M_5a0c_lastvisit=1756033217; yj0M_5a0c_lastact=1756037036%09index.php%09; yj0M_5a0c_st_t=0%7C1756036817%7Cabc85afee8e05d695b2929267559e611; yj0M_5a0c_sendmail=1; yj0M_5a0c_ulastactivity=1756037036%7C0; yj0M_5a0c_auth=fd77dVk912FxISusbqKRBKVlMjs03ZZkRYjdjkPWvFCSiZRwhxuZbdKDf2tWbf%2FUKYjlllF4mmvMaW2ssR09ck9desRe; yj0M_5a0c_lastcheckfeed=2527028%7C1756037036; yj0M_5a0c_checkfollow=1; yj0M_5a0c_lip=47.79.94.249%2C1756037036; yj0M_5a0c_sid=0`;

    const cookies = cookieString.split('; ').map(item => {
        const [name, ...rest] = item.split('=');
        const value = rest.join('=');
        return {
            name,
            value,
            domain: domain,
            path: '/',
            httpOnly: false,
            secure: false,
        };
    });

    await context.addCookies(cookies);
    const page = await context.newPage();

    await page.goto(baseUrl + mobileTXTPath, { waitUntil: 'load', timeout: 0 });

    while (true) {
        const threadList = page.locator('table#threadlisttableid tbody');
        const count = await threadList.count();

        for (let i = 0; i < count; i++) {
            const id = await threadList.nth(i).getAttribute('id');
            if (id != null) {
                if (id.includes("normalthread")) {
                    const link = threadList.nth(i).locator('a.s.xst').first();
                    const href = await link.getAttribute('href');

                    if (href.includes('tid=adver')) {
                        console.log('adver')
                        continue;
                    }

                    const parsedUrl = new URL(baseUrl + href);
                    const tid = parsedUrl.searchParams.get('tid');

                    const row = db.prepare('SELECT tid FROM novels WHERE tid = ?').get(tid);

                    if (row != undefined) {
                        console.log(tid + '-added')
                        continue;
                    }

                    const threadPage = await context.newPage();
                    await threadPage.goto(baseUrl + href, { waitUntil: 'load', timeout: 0 });

                    const fullPageContent = await threadPage.content();

                    if (fullPageContent.includes("您浏览的太快了，歇一会儿吧！")) {
                        console.warn("too fast");
                        await wait(60000);
                        i--;
                        continue;
                    }

                    let title = ''

                    let titleElement = threadPage.locator('span#thread_subject').first();
                    title = await titleElement.textContent();
                    console.log(title)

                    // try {
                    //     let titleElement = threadPage.locator('span#thread_subject').first();
                    //     title = await titleElement.textContent();
                    //     console.log(title)
                    // } catch (err) {
                    //     console.warn("title-loop");
                    //     i--;
                    //     continue;
                    // }

                    const aList = threadPage.locator('div.pcb:first-of-type a');
                    const count = await aList.count();
                    let content = ''

                    for (let i = 0; i < count; i++) {
                        const href = await aList.nth(i).getAttribute('href')
                        if (href != null) {
                            if (href.startsWith('forum.php?mod=attachment&aid=')) {
                                downloadLink = baseUrl + href;
                                const response = await threadPage.request.get(downloadLink, { setTimeout: 6000000 });
                                const buffer = await response.body();

                                const detected = jschardet.detect(buffer);
                                let encoding = (detected.encoding || "utf-8").toLowerCase();

                                if (encoding === "gb2312" || encoding === "gbk") {
                                    encoding = "gb18030";
                                }

                                const content = iconv.decode(buffer, encoding);
                                // if (detected.encoding == 'UTF-8') {
                                //     content += '\n' + iconv.decode(buffer, 'UTF-8');
                                // } else {
                                //     content += '\n' + iconv.decode(buffer, 'GB18030');
                                // }
                            }
                        }
                    }

                    try {
                        const stmt = db.prepare(`INSERT INTO novels (tid, title, content) VALUES (?, ?, ?)`);
                        stmt.run(tid, title, content);
                    } catch (err) {
                        console.error(err);
                    }

                    await threadPage.close()
                }
            }
        }

        const nextElement = page.locator('a.nxt').first();
        if (nextElement == null) {
            console.log('pass')
            break
        } else {
            const nextPath = await nextElement.getAttribute('href')
            if (nextPath != null) {
                await page.goto(baseUrl + nextPath, { waitUntil: 'load', timeout: 0 })
                console.log(baseUrl + nextPath)
            }
        }
    }

    db.close();
    await browser.close();
})();

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}