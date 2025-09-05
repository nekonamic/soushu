const { chromium } = require('playwright');
const iconv = require('iconv-lite');
const jschardet = require('jschardet');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs')

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
    const domain = '3cbg9.sdgvre54q.com'
    const baseUrl = 'https://3cbg9.sdgvre54q.com/'
    const mobileTXTPath = 'forum.php?mod=forumdisplay&fid=102'
    const savePath = './downloads'

    const browser = await chromium.launch({
        headless: false,
        // proxy: {
        //     server: "http://124.94.191.155:40041"
        // }
    });
    const context = await browser.newContext({
        ignoreHTTPSErrors: true
    });
    const cookieString = `yj0M_eda4_saltkey=Zj2pqQCn; yj0M_eda4_lastvisit=1756258948; yj0M_eda4_lastact=1756262702%09index.php%09; PHPSESSID=ollfild76oisbps0h8shvvnh7l; yj0M_eda4_st_t=2527028%7C1756262620%7C847996d4cad16b3af85a3f76d1da95b6; yj0M_eda4_sendmail=1; yj0M_eda4_ulastactivity=1756262607%7C0; yj0M_eda4_auth=cb86O5Ui0pLJxSEbgg7pzR9RVTGzjUotZC5Bd5e2KlpjlUFN9zqA7ySaR5AApNnLc6aMKhfgwqqd9uXBQDNsDANcbP5C; yj0M_eda4_lastcheckfeed=2527028%7C1756262607; yj0M_eda4_lip=221.6.242.203%2C1756262607; yj0M_eda4_sid=0; yj0M_eda4_forum_lastvisit=D_102_1756262620`;

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
    const blankPage = await context.newPage();

    await context.addCookies(cookies);
    let page = await context.newPage();

    while (true) {
        try {
            await page.goto(baseUrl + mobileTXTPath, { waitUntil: 'domcontentloaded', timeout: 10000 });
        } catch (err) {
            console.log(err)
            await page.close()
            page = await context.newPage();
            continue
        }
        break
    }


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
                    try {
                        await threadPage.goto(baseUrl + href, { waitUntil: 'domcontentloaded', timeout: 10000 });
                    } catch (err) {
                        console.log(err)
                        await threadPage.close()
                        i--
                        continue
                    }


                    const fullPageContent = await threadPage.content();

                    if (fullPageContent.includes('您浏览的太快了，歇一会儿吧！')) {
                        console.warn("too fast");
                        await wait(60000);
                        await threadPage.close()
                        i--;
                        continue;
                    } else if (fullPageContent.includes('没有找到帖子')) {
                        console.warn("no topic");
                        await threadPage.close()
                        continue;
                    } else if (fullPageContent.includes('Database Error')) {
                        console.warn("db error");
                        await threadPage.close()
                        i--;
                        continue;
                    }

                    let title = ''

                    try {
                        let titleElement = threadPage.locator('span#thread_subject').first();
                        title = await titleElement.textContent();
                        console.log(title)
                    } catch (err) {
                        console.log(err)
                        await threadPage.close()
                        i--
                        continue
                    }


                    const aList = threadPage.locator('div.pcb:first-of-type a');
                    const count = await aList.count();
                    if (count == 0) {
                        threadPage.close()
                        continue
                    }
                    try {
                        const test = await aList.nth(0).getAttribute('href')
                    } catch (err) {
                        console.log(err)
                        await threadPage.close()
                        i--
                        continue
                    }

                    for (let i = 0; i < count; i++) {
                        const href = await aList.nth(i).getAttribute('href')
                        if (href != null) {
                            if (href.startsWith('forum.php?mod=attachment&aid=')) {
                                downloadLink = baseUrl + href;

                                var response
                                while (true) {
                                    try {
                                        response = await threadPage.request.get(downloadLink);
                                    } catch (err) {
                                        console.log(err)
                                        const buffer = await response.body();
                                        console.log(buffer)
                                        continue
                                    }
                                    break
                                }


                                const contentType = response.headers()['content-type'];
                                const contentDisposition = response.headers()['content-disposition'];
                                let filename = '';
                                const buffer = await response.body();

                                if (contentDisposition) {
                                    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                                    if (filenameMatch && filenameMatch[1]) {
                                        filename = filenameMatch[1];
                                    }
                                } else {
                                    if (buffer.toString().includes('Discuz! System Error')) {
                                        break
                                    }
                                    i--
                                    continue
                                }

                                filename = filename.replace(/[\\/:*?"<>|]/g, "_");

                                const targetDir = savePath + '/' + tid
                                fs.mkdirSync(targetDir, { recursive: true });

                                // const buffer = await response.body();

                                const filePath = path.resolve(targetDir, filename);
                                fs.writeFileSync(filePath, buffer);
                            }
                        }
                    }

                    try {
                        const stmt = db.prepare(`INSERT INTO novels (tid, title, content) VALUES (?, ?, ?)`);
                        stmt.run(tid, title, '');
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
            var contentStr = ''
            if (nextPath != null) {
                while (true) {
                    try {
                        await page.goto(baseUrl + nextPath, { waitUntil: 'domcontentloaded', timeout: 10000 })
                        contentStr = await page.content();
                    } catch (err) {
                        console.log(err)
                        await page.close()
                        page = await context.newPage();
                        continue
                    }
                    if (contentStr.includes('Database Error')) {
                        continue
                    }
                    break
                }
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