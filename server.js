const axios = require('axios');
const bookTicker = require("./bookTicker");
const Binance = require("./apibinance");
var shell = require('shelljs');
const dayjs = require('dayjs');
const fs = require('fs');
var os = require("os");

let STEPCOIN = "0";
let STEPORDER = 0;
let count2 = 0;
let count3 = 0;
let count4 = 0;

const QUOTE = ["USDT"];

const INTERVAL = parseInt(0);
const PROFITABILITY_STEP1 = parseFloat(0.1);
const PROFITABILITY_STEP2 = parseFloat(0.2);
const PROFITABILITY_STEP3 = parseFloat(0.3);

const LOSS = parseFloat(1); // STOP LOSS 3%
const FUNDS = parseFloat(804);

var SETINTER = null;

// off/on whitelist coin
const symbolVolStatus = false;
const symbolVol = [
    "MIR",
    "SHIB",
    "SLP",
    "BTC",
    "LTC",
    "ATOM",
    "MDX",
    "ADAETH",
    "ETH",
    "LINK",
    "AUD",
    "LIT",
    "ERN",
    "GBP",
    "XRP",
    "QNT",
    "EUR",
    "REEF",
    "TRX",
    "CAKE",
    "GALA",
    "NEAR",
    "HBAR",
    "MATIC",
    "FIRO",
    "FTM",
    "LUNC",
    "CHZ",
    "ADA",
    "ETC",
    "DYDX",
    "GMX",
    "ENS",
    "SANTOS",
    "AMP",
    "JASMY",
    "MOB"];

function getBuySellSell(buySymbols, allSymbols, symbolsMap) {
    const buySellSell = [];
    for (let i = 0; i < buySymbols.length; i++) {
        const buy1 = buySymbols[i];

        const right = allSymbols.filter(s => s.base === buy1.base && s.quote !== buy1.quote);

        for (let j = 0; j < right.length; j++) {
            const sell1 = right[j];

            const sell2 = symbolsMap[sell1.quote + buy1.quote];
            if (!sell2) continue;

            if (symbolVolStatus) {
                symbolVol.filter(function (str) {
                    if (str.indexOf(buy1.base) >= 0) {
                        buySellSell.push({ buy1, sell1, sell2 });
                    }
                });
            } else {
                buySellSell.push({ buy1, sell1, sell2 });
            }
        }
    }
    return buySellSell;
}
function countDecimals(value) {
    if (Math.floor(value) !== value && value.toString().split(".").length !== 1) {
        return value.toString().split(".")[1].length || 0;
    } else {
        return 0;
    }
}

const TO_FIXED_MAX = 100;

function truncate(number, decimalsPrecison) {
    // make it a string with precision 1e-100
    number = number.toFixed(TO_FIXED_MAX);

    // chop off uneccessary digits
    const dotIndex = number.indexOf('.');
    number = number.substring(0, dotIndex + decimalsPrecison + 1);

    // back to a number data type (app specific)
    return Number.parseFloat(number);
}

function getSymbolMap(symbols) {
    const map = {};
    symbols.map(s => map[s.symbol] = s);
    return map;
}

async function exchangeInfo() {
    const response = await axios.get("https://api.binance.com/api/v3/exchangeInfo");
    return response.data.symbols.filter(s => s.status === 'TRADING').map(s => {
        return {
            symbol: s.symbol,
            base: s.baseAsset,
            quote: s.quoteAsset
        }
    });
}

async function processBuySellSell(buySellSell) {
    for (let i = 0; i < buySellSell.length; i++) {
        const candidate = buySellSell[i];

        let getAskPriceBuy = bookTicker.getBook(candidate.buy1.symbol);
        if (!getAskPriceBuy) continue;
        let askPriceBuy = parseFloat(getAskPriceBuy.ask); // ราคาเหรียญ
        let askQtyBuy = parseFloat(getAskPriceBuy.askQty); // จำนวนเหรียญ

        let getBidPriceSell1 = bookTicker.getBook(candidate.sell1.symbol);
        if (!getBidPriceSell1) continue;
        let bidPriceSell1 = parseFloat(getBidPriceSell1.bid); // ราคาเหรียญ
        let bidQtySell1 = parseFloat(getBidPriceSell1.askQty); // จำนวนเหรียญ

        let getBidPriceSell2 = bookTicker.getBook(candidate.sell2.symbol);
        if (!getBidPriceSell2) continue;
        let bidPriceSell2 = parseFloat(getBidPriceSell2.bid); // ราคาเหรียญ
        let bidQtySell2 = parseFloat(getBidPriceSell2.askQty); // จำนวนเหรียญ

        let totalusd1 = askQtyBuy * askPriceBuy;
        let totalusd2 = bidQtySell1 * askPriceBuy;
        let totalusd3 = bidQtySell2 * bidPriceSell2;
        var totalusd = Math.min(totalusd1, totalusd2, totalusd3)
        let checkcoin = candidate.sell2.symbol

        let QuantityStep1 = 0
        let typStep = ""

        if (totalusd === totalusd1) {
            typStep = "totalusd1"
            QuantityStep1 = askQtyBuy.toFixed(2)
        }
        if (totalusd === totalusd2) {
            typStep = "totalusd2"
            QuantityStep1 = bidQtySell1.toFixed(2)
        }
        if (totalusd === totalusd3) {
            typStep = "totalusd3"
            QuantityStep1 = (totalusd3 / askPriceBuy).toFixed(2)
        }

        const crossRates = ((1 / askPriceBuy) * bidPriceSell1 * bidPriceSell2);
        const crossRate = (crossRates - 1) * 100;
        // && STEPCOIN !== candidate.buy1.symbol
        if (crossRate > PROFITABILITY_STEP1 && checkcoin.indexOf('BNB') === -1 && STEPORDER === 0 && totalusd > 300) {

            // fs.writeFile('logs.txt', "SUCCESS: " + candidate.buy1.symbol, { flag: 'a' }, err => {});

            STEPORDER = 1;
            console.log("SUCCESS", candidate.buy1.symbol);
            processInput("SUCCESS " + candidate.buy1.symbol);

            // let getAskPriceBuy = bookTicker.getBook(candidate.buy1.symbol);
            // if (!getAskPriceBuy) continue;
            // let priceBuyticker = parseFloat(getAskPriceBuy.ask); // ราคาเหรียญ

            // let getBidPriceSell1 = bookTicker.getBook(candidate.sell1.symbol);
            // if (!getBidPriceSell1) continue;
            // let priceSell1ticker = parseFloat(getBidPriceSell1.bid); // ราคาเหรียญ

            // let getBidPriceSell2 = bookTicker.getBook(candidate.sell2.symbol);
            // if (!getBidPriceSell2) continue;
            // let priceSell2ticker = parseFloat(getBidPriceSell2.bid); // ราคาเหรียญ

            let ticker = await Binance.pricesAll();

            let priceBuyticker = ticker[candidate.buy1.symbol];
            let priceSell1ticker = ticker[candidate.sell1.symbol];
            let priceSell2ticker = ticker[candidate.sell2.symbol];

            // let priceSell1S = parseFloat(priceSell1tickerOld - ((priceSell1tickerOld * 0.2) / 100));
            // let countDec = countDecimals(priceSell1tickerOld)
            // let priceSell1ticker = parseFloat(truncate(priceSell1S, countDec))

            const crossRates2 = ((1 / priceBuyticker) * (priceSell1ticker) * priceSell2ticker);
            const crossRate2 = (crossRates2 - 1) * 100;

            if (crossRate2 > PROFITABILITY_STEP1 && STEPORDER === 1) {

                const allSymbols = await axios.get("https://api.binance.com/api/v3/exchangeInfo");
                const tradingPairInfo1 = allSymbols.data.symbols.filter(
                    (item) => item.symbol == candidate.buy1.symbol
                )[0]

                const lotSizeInfo1 = tradingPairInfo1.filters.filter(
                    (item) => item.filterType === "LOT_SIZE"
                )[0]

                // // ซื้อราคา 10% จากราคาจริง
                let buyStep1 = ((QuantityStep1 * 10) / 100);

                const quantitys1 = await Binance.roundStep(buyStep1, lotSizeInfo1.stepSize);

                const resultBuy = await Binance.order("BUY", candidate.buy1.symbol, quantitys1, priceBuyticker, { type: 'LIMIT' });

                // console.log(resultBuy);
                if (resultBuy && resultBuy.orderId) {

                    console.info("order id: " + resultBuy.orderId);
                    console.log('STEP1', "[BUY]->[Success]");
                    processInput("STEP1 order id " + resultBuy.orderId);

                    // check order ถ้าไม่มีให้ cancel order 
                    const openOrders = await Binance.openOrders(candidate.buy1.symbol);
                    if (openOrders.length !== 0) {
                        console.log('openOrders', resultBuy.orderId);
                        processInput("openOrders" + resultBuy.orderId);
                        // พบเจอรายการซื้อ ยกเลิกรายการ
                        const cancel = await Binance.CancelOrder(resultBuy.orderId, candidate.buy1.symbol);
                        if (cancel) {
                            console.log("[STEP1] Cancel orderId", resultBuy.orderId)
                            console.log('Cancel', "[SELL]->[Success]");
                            processInput("[STEP1] Cancel orderId " + resultBuy.orderId);
                            STEPORDER = 0;
                        } else {
                            // ไม่พบ orderid cancel
                            console.log(cancel);
                            STEPORDER = 0;
                        }
                    } else {
                        // clearInterval(SETINTER);

                        console.log('STEPORDER ' + STEPORDER + ':', resultBuy.orderId);
                        processInput("STEPORDER " + STEPORDER + ": " + resultBuy.orderId);

                        // let _interval4 = setInterval(async () => {
                        //     count4++;
                        //     if (count4 >= 2) {
                        // SELL SELL
                        if (STEPORDER === 1) {
                            STEPORDER = 2;

                            console.log('STEPORDER2 ' + STEPORDER + ':', resultBuy.orderId);
                            processInput("STEPORDER2 " + STEPORDER + ": " + resultBuy.orderId);

                            // เข้าสู่การขายครั้งที่ 1
                            const tradingPairInfo2 = allSymbols.data.symbols.filter(
                                (item) => item.symbol == candidate.sell1.symbol
                            )[0]

                            const lotSizeInfo2 = tradingPairInfo2.filters.filter(
                                (item) => item.filterType === "LOT_SIZE"
                            )[0]
                            const quantitys2 = await Binance.roundStep(await Binance.getBalance(candidate.sell1.base), lotSizeInfo2.stepSize);

                            const resultSell = await Binance.order("SELL", candidate.sell1.symbol, quantitys2, priceSell1ticker, { type: 'LIMIT' });
                            if (resultSell && resultSell.orderId) {
                                // SELL 1 SUCCESS

                                console.info("order id: " + resultSell.orderId);
                                console.log('STEP2', "[SELL]->[Working]");
                                processInput("[SELL]STEP2 order id " + resultSell.orderId + " - priceSell1ticker " + priceSell1ticker);

                                let _interval2 = setInterval(async () => {

                                    const openOrders = await Binance.openOrders(candidate.sell1.symbol);
                                    if (openOrders.length !== 0) {
                                        // console.log(openOrders);
                                        console.clear();
                                        shell.exec('clear')
                                        count2++;
                                        // เช็ค 30 รอบ จนกว่าจะรายการขายหายไป 
                                        // หากไม่หายพายใน 30 วิ/ครั้ง จะยกเลิกออเดอร์ และ ขายกลับไปเป็นเหรียญ USDT,BUSD
                                        if (count2 >= 30) {
                                            clearInterval(_interval2); // หยุดทำงานวนลูป
                                            const cancel = await Binance.CancelOrder(resultSell.orderId, candidate.sell1.symbol);
                                            if (cancel) {

                                                const tradingPairInfo2Ss = allSymbols.data.symbols.filter(
                                                    (item) => item.symbol == candidate.buy1.symbol
                                                )[0]

                                                const lotSizeInfo2Ss = tradingPairInfo2Ss.filters.filter(
                                                    (item) => item.filterType === "LOT_SIZE"
                                                )[0]
                                                const quantitys2Ss = await Binance.roundStep(await Binance.getBalance(candidate.buy1.base), lotSizeInfo2Ss.stepSize);
                                                const resultSellMarket = await Binance.order("SELL", candidate.buy1.symbol, quantitys2Ss);
                                                if (resultSellMarket && resultSellMarket.orderId) {
                                                    console.info("order id: " + resultSellMarket.orderId);
                                                    console.log('Cancel', "[SELL]->[Success]");
                                                    console.log("You Loss!!!");
                                                    processInput("[You Loss] order id " + resultSellMarket.orderId);

                                                    if (QUOTE && QUOTE[0] && QUOTE[1]) {
                                                        console.log("Last balance:", await Binance.getBalance(QUOTE[0]));
                                                        console.log("Last balance:", await Binance.getBalance(QUOTE[1]));
                                                    } else {
                                                        processInput("Last balance " + await Binance.getBalance(QUOTE[0]));
                                                        console.log("Last balance:", await Binance.getBalance(QUOTE[0]));
                                                    }
                                                } else {
                                                    console.log("error", resultSellMarket);
                                                }
                                            } else {
                                                console.log("error", cancel);
                                            }
                                            count2 = 0;
                                            // หยุดการทำงาน
                                            STEPORDER = 0;
                                        }
                                    } else {
                                        // เข้าสู่การขายครั้งที่ 2
                                        clearInterval(_interval2); // หยุดทำงานวนลูป

                                        if (STEPORDER === 2) {
                                            STEPORDER = 3;

                                            console.log('STEP2', "[SELL]->[Success]");
                                            processInput("STEP2 [SELL]->[Success]");

                                            // =================================== SELL2 ==================================
                                            const tradingPairInfo3 = allSymbols.data.symbols.filter(
                                                (item) => item.symbol == candidate.sell2.symbol
                                            )[0]

                                            const lotSizeInfo3 = tradingPairInfo3.filters.filter(
                                                (item) => item.filterType === "LOT_SIZE"
                                            )[0]
                                            const quantitys3 = await Binance.roundStep(await Binance.getBalance(candidate.sell2.base), lotSizeInfo3.stepSize);

                                            let priceSell2Step = 0;
                                            if (candidate.sell2.symbol === "BUSDUSDT") {
                                                priceSell2Step = await Binance.roundStep(priceSell2ticker, lotSizeInfo3.stepSize);
                                            } else {
                                                priceSell2Step = priceSell2ticker
                                            }

                                            const resultSell2 = await Binance.order("SELL", candidate.sell2.symbol, quantitys3, priceSell2Step, { type: 'LIMIT' });
                                            if (resultSell2 && resultSell2.orderId) {

                                                console.info("order id: " + resultSell2.orderId);
                                                console.log('STEP3', "[SELL]->[Working]");
                                                processInput("[STEP3] order id " + resultSell2.orderId);

                                                let _interval3 = setInterval(async () => {
                                                    const openOrders = await Binance.openOrders(candidate.sell2.symbol);
                                                    if (openOrders.length !== 0) {
                                                        // console.log(openOrders);
                                                        console.clear();
                                                        shell.exec('clear')
                                                        count3++;
                                                        // เช็ค 10 รอบ จนกว่าจะรายการขายหายไป 
                                                        // หากไม่หายพายใน 10 วิ/ครั้ง จะยกเลิกออเดอร์ และ ขายกลับไปเป็นเหรียญ USDT,BUSD
                                                        if (count3 >= 30) {
                                                            clearInterval(_interval3); // หยุดทำงานวนลูป
                                                            const cancel = await Binance.CancelOrder(resultSell2.orderId, candidate.sell2.symbol);
                                                            if (cancel) {

                                                                const tradingPairInfoSell2 = allSymbols.data.symbols.filter(
                                                                    (item) => item.symbol == candidate.sell2.symbol
                                                                )[0]

                                                                const lotSizeInfoSell2 = tradingPairInfoSell2.filters.filter(
                                                                    (item) => item.filterType === "LOT_SIZE"
                                                                )[0]
                                                                const quantitysSell2 = await Binance.roundStep(await Binance.getBalance(candidate.sell2.base), lotSizeInfoSell2.stepSize);
                                                                const resultSell2Market = await Binance.order("SELL", candidate.sell2.symbol, quantitysSell2);
                                                                if (resultSell2Market && resultSell2Market.orderId) {
                                                                    console.info("order id: " + resultSell2Market.orderId);
                                                                    console.log('Cancel', "[SELL]->[Success]");
                                                                    processInput("[STEP3] Cancel order id " + resultSell2Market.orderId);

                                                                    if (QUOTE && QUOTE[0] && QUOTE[1]) {

                                                                        let totalCoin = parseFloat(await Binance.getBalance(QUOTE[0])) + parseFloat(await Binance.getBalance(QUOTE[1]));
                                                                        const STOPLOSS = totalCoin - (parseFloat(FUNDS) * LOSS / 100);
                                                                        if (STOPLOSS >= totalCoin) {
                                                                            STEPORDER = 5;
                                                                            console.log("STOP LOSS", "You Loss 5%");
                                                                            console.info("Last balance: ", totalCoin);
                                                                        }
                                                                    } else {
                                                                        const getBalance = await Binance.getBalance(QUOTE[0]);
                                                                        const STOPLOSS = parseFloat(getBalance) - (parseFloat(FUNDS) * LOSS / 100);
                                                                        if (STOPLOSS >= parseFloat(getBalance)) {
                                                                            STEPORDER = 5;
                                                                            console.log("STOP LOSS", "You Loss 5%");
                                                                            console.info("Last balance: ", getBalance);
                                                                            processInput("[STOP] Last balance " + getBalance);
                                                                        }
                                                                    }
                                                                } else {
                                                                    console.log("error", resultSell2Market);
                                                                }
                                                            } else {
                                                                console.log("error", cancel);
                                                            }
                                                            count3 = 0;
                                                            STEPORDER = 0;
                                                            console.clear()
                                                        }
                                                    } else {
                                                        clearInterval(_interval3);

                                                        console.log('STEP3', "[SELL]->[Success]");
                                                        console.log("Price Buy", priceBuyticker, "Price Sell1", priceSell1ticker, "Price Sell2", priceSell2ticker)
                                                        console.log("typStep:", typStep);
                                                        console.log("Quantity Old:", QuantityStep1);
                                                        console.log("Quantity New:", quantitys1);
                                                        console.log("QuantityStep1 :", QuantityStep1 * 10 / 100);
                                                        let endbn = (((totalusd / priceBuyticker) * priceSell1ticker) * priceSell2ticker)
                                                        console.log(`USE METHOD BSS | ${candidate.buy1.symbol} [${priceBuyticker}] [${askQtyBuy}] > ${candidate.sell1.symbol} [${priceSell1ticker}] [${bidQtySell1}] > ${candidate.sell2.symbol} [${priceSell2Step}] [${bidQtySell2}]`);
                                                        console.log(`START [BALANCE] ${totalusd * 10 / 100}, END [BALANCE] ${endbn * 10 / 100}`);
                                                        console.log('Profit:' + crossRate2.toFixed(3) + '%')
                                                        console.log("DateTime:", dayjs().format("YYYY-MM-DD HH:mm:ss"));
                                                        console.log('================================');

                                                        processInput(`USE METHOD BSS | ${candidate.buy1.symbol} [${priceBuyticker}] [${askQtyBuy}] > ${candidate.sell1.symbol} [${priceSell1ticker}] [${bidQtySell1}] > ${candidate.sell2.symbol} [${priceSell2Step}] [${bidQtySell2}]`);
                                                        processInput(`START [BALANCE] ${totalusd * 10 / 100}, END [BALANCE] ${endbn * 10 / 100}`);
                                                        processInput('================================');

                                                        if (QUOTE && QUOTE[0] && QUOTE[1]) {

                                                            let totalCoin = parseFloat(await Binance.getBalance(QUOTE[0])) + parseFloat(await Binance.getBalance(QUOTE[1]));
                                                            const STOPLOSS = totalCoin - (parseFloat(FUNDS) * LOSS / 100);
                                                            if (STOPLOSS >= totalCoin) {
                                                                STEPORDER = 5;
                                                                console.log("STOP LOSS", "You Loss 5%");
                                                                console.info("Last balance: ", totalCoin);
                                                            }
                                                        } else {
                                                            const getBalance = await Binance.getBalance(QUOTE[0]);
                                                            const STOPLOSS = parseFloat(getBalance) - (parseFloat(FUNDS) * LOSS / 100);
                                                            if (STOPLOSS >= parseFloat(getBalance)) {
                                                                STEPORDER = 5;
                                                                console.log("STOP LOSS", "You Loss 5%");
                                                                console.info("Last balance: ", getBalance);
                                                                processInput("[STOP] Last balance " + getBalance);
                                                            }
                                                        }

                                                        if (QUOTE && QUOTE[0] && QUOTE[1]) {
                                                            console.log("Last balance:", await Binance.getBalance(QUOTE[0]));
                                                            console.log("Last balance:", await Binance.getBalance(QUOTE[1]));
                                                        } else {
                                                            processInput("Last balance " + await Binance.getBalance(QUOTE[0]));
                                                            console.log("Last balance:", await Binance.getBalance(QUOTE[0]));
                                                        }

                                                        // หยุดการทำงาน
                                                        setTimeout(() => {
                                                            console.log("Delayed for 2 second.");
                                                            STEPORDER = 0;
                                                        }, 2000)
                                                    }
                                                }, 1000);

                                            }
                                        }
                                    }

                                }, 1000);

                            } else {
                                console.log(resultSell);
                                STEPORDER = 0;
                                processInput("error sell11 " + priceSell1ticker);
                            }
                        } else {
                            console.log("error", "STEP ERROR");
                            processInput("STEP ERROR");
                            STEPORDER = 0;
                        }
                        // }
                        // }, 100);
                    }
                } else {
                    console.log("error", resultBuy);
                    STEPORDER = 0;
                }
            } else {
                console.log("error:", "not found profit");
                processInput("not found profit");
                STEPORDER = 0;
            }
        }
    }
}

function processInput(text) {
    fs.open('logs.log', 'a', 777, function (e, id) {
        fs.write(id, text + os.EOL, null, 'utf8', function () {
            fs.close(id, function () {
                // console.log('file is updated');
            });
        });
    });
}

async function main() {
    if (QUOTE && QUOTE[0] && QUOTE[1]) {
        console.log("Last balance:", await Binance.getBalance(QUOTE[0]));
        console.log("Last balance:", await Binance.getBalance(QUOTE[1]));
    } else {
        console.log("Last balance:", await Binance.getBalance(QUOTE[0]));
    }

    //pega todas moedas que estão sendo negociadas
    console.log('Loading Exchange Info...');
    const allSymbols = await exchangeInfo();

    //moedas que você pode comprar
    const buySymbols = allSymbols.filter(s => s.quote === QUOTE[0] || s.quote === QUOTE[1]);
    console.log('There are ' + buySymbols.length + " pairs that you can buy with " + QUOTE);

    //organiza em map para performance
    const symbolsMap = getSymbolMap(allSymbols);

    //descobre todos os pares que podem triangular BUY-SELL-SELL
    const buySellSell = getBuySellSell(buySymbols, allSymbols, symbolsMap);
    console.log('There are ' + buySellSell.length + " pairs that we can do BSS");

    // setInterval(async () => {
    //     let ticker = await Binance.pricesAll();
    //     let priceSell1ticker = ticker["RAREBUSD"];

    //     console.log(priceSell1ticker);
    // }, 1000)

    SETINTER = setInterval(async () => {
        // console.log(new Date());
        processBuySellSell(buySellSell);
    }, INTERVAL)
}

main();