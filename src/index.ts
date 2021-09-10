import puppeteer from 'puppeteer'
import yargs from 'yargs'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface Size {
  width: number
  height: number
  deviceScaleFactor: number
}

interface Page {
  url: string
  sizes: Size[]
}

const argv = yargs
  .scriptName('fusilador')
  .usage('$0 shoot [urls] [sizes]')
  .command(
    'shoot [urls] [sizes]',
    '',
    (yargs) => {
      yargs.positional('urls', {
        type: 'string',
        default: 'localhost:8080',
        describe: 'urls to screenshot',
      })
      yargs.positional('sizes', {
        type: 'string',
        default: '320',
        describe: 'widths',
      })
    },
    function (argv: any) {
      const urls = argv.urls.split(',')
      const sizes = argv.sizes
        .split(',')
        .map((size: string) => size.split(':').map((s: any) => parseInt(s)))

        .map(
          ([width, height, deviceScaleFactor]: [number, number, number]) => ({
            width,
            height: height ?? 960,
            deviceScaleFactor: deviceScaleFactor ?? 1,
          })
        )
      const pages = urls.map((url: string) => ({
        url,
        sizes,
      }))
      shootPages(pages)
    }
  )
  .help().argv

async function shootPages(pages: Page[]) {
  let browser = await puppeteer.launch({ headless: true })
  let browserPage = await browser.newPage()
  for (const page of pages) {
    await shootPage(browser, page)
  }
  await browser.close()
}

async function shootPage(browser: puppeteer.Browser, page: Page) {
  let browserPage = await browser.newPage()
  for (const size of page.sizes) {
    console.log(
      `Shooting ${page.url} at width: ${size.width}, height: ${size.height} and scale: ${size.deviceScaleFactor}`
    )

    let fixedSize = { ...size }
    if (size.deviceScaleFactor !== 1) {
      fixedSize.height = size.height / size.deviceScaleFactor
      fixedSize.width = size.width / size.deviceScaleFactor
    }

    await browserPage.setViewport(fixedSize as puppeteer.Viewport)
    await browserPage.goto(page.url)
    await delay(1000)

    const sizeName = `${size.width}${size.height ? `-${size.height}` : ''}`
    const name = `${page.url}-${sizeName}`.replace(/[^a-zA-Z\-\d]/g, '')

    const path = `./out/${name}.jpg`
    await browserPage.screenshot({ path, type: 'jpeg' })
  }
  await browserPage.close()
}
