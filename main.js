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

db.close();

(async () => {
    const domain = 'ac1ss.ascwefkjw.com'
    const baseUrl = 'https://ac1ss.ascwefkjw.com/'
    const mobileTXTPath = 'forum.php?mod=forumdisplay&fid=40'

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const cookieString = `PHPSESSID=fehap6pvv43kuu7r4foskqi2dp; yj0M_5a0c_ulastactivity=1755685095%7C0; yj0M_5a0c_saltkey=wTb5t5gB; yj0M_5a0c_lastvisit=1755680847; yj0M_5a0c_lastact=1755685522%09forum.php%09viewthread; yj0M_5a0c__refer=%252Fhome.php%253Fmod%253Dspacecp%2526ac%253Dprofile%2526op%253Dpassword; yj0M_5a0c_auth=cf10GXGgtSukhwCS4cImZ9JYBSVvTghCdTsq1ht4qyebLeDNdTprQaXQm7vXC%2FDyke9L51ISDV24Z%2FENcwBPiu43hek; yj0M_5a0c_lastcheckfeed=588604%7C1755684455; yj0M_5a0c_lip=47.79.94.249%2C1755684455; yj0M_5a0c_sid=0; yj0M_5a0c_nofavfid=1; yj0M_5a0c_st_t=588604%7C1755685250%7C1cb744b1014d3a5af96469584e0de3cb; yj0M_5a0c_forum_lastvisit=D_102_1755684843D_72_1755684870D_103_1755685011D_40_1755685250; yj0M_5a0c_smile=1D1; yj0M_5a0c_st_p=588604%7C1755685522%7C591978a0f584979afc565ead1ec9e755; yj0M_5a0c_viewid=tid_1324402`;

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

    // 添加 Cookie
    await context.addCookies(cookies);
    const page = await context.newPage();

    await page.goto(baseUrl + mobileTXTPath, { waitUntil: 'load' });

    while (true) {
        const threadList = page.locator('table#threadlisttableid tbody');
        const count = await threadList.count();

        for (let i = 0; i < count; i++) {
            const id = await threadList.nth(i).getAttribute('id');
            if (id != null) {
                if (id.includes("normalthread")) {
                    const link = threadList.nth(i).locator('a.s.xst').first();
                    const href = await link.getAttribute('href');

                    const parsedUrl = new URL(baseUrl + href);
                    const tid = parsedUrl.searchParams.get('tid');

                    if (href.includes('tid=adver')) {
                        console.log('adver')
                        continue;
                    }

                    const db = new Database('./novel.db');

                    const row = db.prepare('SELECT tid FROM novels WHERE tid = ?').get(tid);

                    if (row != undefined) {
                        console.log(tid + '-added')
                        continue;
                    }

                    const threadPage = await context.newPage();
                    await threadPage.goto(baseUrl + href, { waitUntil: 'load' });

                    const fullPageContent = await threadPage.content();

                    if (fullPageContent.includes("您浏览的太快了，歇一会儿吧！")) {
                        console.warn("too fast");
                        await wait(60000);
                        i--;
                        continue;
                    }

                    let title = ''

                    try {
                        let titleElement = threadPage.locator('span#thread_subject').first();
                        title = await titleElement.textContent();
                        console.log(title)
                    } catch (err) {
                        console.warn("title-loop");
                        i--;
                        continue;
                    }

                    const aList = threadPage.locator('a');
                    const count = await aList.count();

                    for (let i = 0; i < count; i++) {
                        const href = await aList.nth(i).getAttribute('href')
                        if (href != null) {
                            if (href.startsWith('forum.php?mod=attachment&aid=')) {
                                downloadLink = baseUrl + href;
                                break;
                            }
                        }
                    }
                    const response = await threadPage.request.get(downloadLink);
                    const buffer = await response.body();

                    const detected = jschardet.detect(buffer);
                    let content = ''
                    if (detected.encoding == null) {
                        content = iconv.decode(buffer, 'UTF-8');
                    } else {
                        content = iconv.decode(buffer, detected.encoding);
                    }

                    try {
                        const stmt = db.prepare(`INSERT INTO novels (tid, title, content) VALUES (?, ?, ?)`);
                        stmt.run(tid, title, content);
                    } catch (err) {
                        console.error(err);
                    } finally {
                        db.close();
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
                await page.goto(baseUrl + nextPath, { waitUntil: 'load' })
                console.log(baseUrl + nextPath)
            }
        }
    }

    await browser.close();
})();

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}