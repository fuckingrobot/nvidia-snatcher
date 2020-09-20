import {Store} from './store';
import {Browser, Response} from 'puppeteer';
import {timestampUrlParam} from "../timestamp-url-param";
import {Logger} from "../../logger";
import open from 'open';

const fe2060SuperId = 5379432500;
const fe3080Id = 5438481700;
const locale = 'en_us';

const nvidiaApiKey = '9485fa7b159e42edb08a83bde0d83dia';

function digitalRiverStockUrl(id: number): string {
	return `https://api.digitalriver.com/v1/shoppers/me/products/${id}/inventory-status?` +
		`&apiKey=${nvidiaApiKey}` +
		timestampUrlParam();
}

interface NvidiaSessionTokenJSON {
	access_token: string;
}

function nvidiaSessionUrl(): string {
	return `https://store.nvidia.com/store/nvidia/SessionToken?format=json&locale=${locale}` +
		`&apiKey=${nvidiaApiKey}` +
		timestampUrlParam();
}

function addToCartUrl(id: number, token: string): string {
	return 'https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items?format=json&method=post' +
		`&productId=${id}` +
		`&token=${token}` +
		'&quantity=1' +
		timestampUrlParam();
}

function checkoutUrl(token: string): string {
	return `https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?token=${token}`;
}

function fallbackCartUrl(): string {
	return `https://www.nvidia.com/en-us/shop/geforce?${timestampUrlParam()}`
}

function generateCartAction(id: number, locale: string, cardName: string) {
	return async (browser: Browser) => {
		const page = await browser.newPage();
		Logger.info(`🚀🚀🚀 [nvidia] ${cardName}, starting auto add to cart... 🚀🚀🚀`);
		let response: Response | null;
		try {
			Logger.info(`🚀🚀🚀 [nvidia] ${cardName}, getting access token... 🚀🚀🚀`);
			response = await page.goto(nvidiaSessionUrl(), {waitUntil: 'networkidle0'});
			if (response === null) { throw 'NvidiaAccessTokenUnavailable'; }

			let data = <NvidiaSessionTokenJSON>await response.json();
			let accessToken = data.access_token;

			Logger.info(`🚀🚀🚀 [nvidia] ${cardName}, adding to cart... 🚀🚀🚀`);
			response = await page.goto(addToCartUrl(id, accessToken), {waitUntil: 'networkidle0'});

			Logger.info(`🚀🚀🚀 [nvidia] ${cardName}, opening checkout page... 🚀🚀🚀`);
			Logger.info(checkoutUrl(accessToken));
			await open(checkoutUrl(accessToken));
		} catch (e) {
			Logger.error(e);
			Logger.error(`✖ [nvidia] ${cardName} could not automatically add to cart, opening page`);
			await open(fallbackCartUrl());
		}
		await page.close();
	}
}

export const Nvidia: Store = {
	links: [
		{
			series: 'debug',
			brand: 'TEST',
			model: 'CARD',
			url: digitalRiverStockUrl(fe2060SuperId),
			openCartAction: generateCartAction(fe2060SuperId, locale, 'TEST CARD')
		},
		{
			series: '3080',
			brand: 'nvidia',
			model: 'founders edition 3080',
			url: digitalRiverStockUrl(fe3080Id),
			openCartAction: generateCartAction(fe3080Id, locale, 'nvidia founders edition 3080')
		}
	],
	labels: {
		oosList: ['product_inventory_out_of_stock', 'rate limit exceeded']
	},
	name: 'nvidia'
};
