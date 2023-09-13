const axios = require('axios');
const crypto = require('crypto');
const APIKEY = "";
const APISECRET = "";

const makeQueryString = q =>
    Object.keys(q)
        .reduce((a, k) => {
            if (Array.isArray(q[k])) {
                q[k].forEach(v => {
                    a.push(k + "=" + encodeURIComponent(v))
                })
            } else if (q[k] !== undefined) {
                a.push(k + "=" + encodeURIComponent(q[k]));
            }
            return a;
        }, [])
        .join("&");

const priceData = (data) => {
    const prices = {};
    if (Array.isArray(data)) {
        for (let obj of data) {
            prices[obj.symbol] = obj.price;
        }
    } else { // Single price returned
        prices[data.symbol] = data.price;
    }
    return prices;
};
async function prices(symbol) {

    const params = typeof symbol === 'string' ? '?symbol=' + symbol : '';
    const result = await axios.get("https://api.binance.com/api/v3/ticker/price" + params).catch(function (error) {
        if (error) {
            // console.info(error.response.data);
            return error.response.data;
        }
    });
    return result.data.price;
}
async function pricesAll() {
    const result = await axios.get("https://api.binance.com/api/v3/ticker/price").catch(function (error) {
        if (error) {
            // console.info(error.response.data);
            return error.response.data;
        }
    });
    return priceData(result.data);
}
async function bookTickers(symbol) {
    const result = await axios.get("https://api.binance.com/api/v3/ticker/bookTicker?symbol=" + symbol).catch(function (error) {
        if (error) {
            // console.info(error.response.data);
            return error.response.data;
        }
    });
    return result.data;
}
async function order(side, symbol, quantity, price, flags = {}) {
    const timestamp = Date.now();

    let data = {
        "symbol": symbol,
        "side": side,
        "type": 'MARKET',
        "quantity": quantity,
        // "price": price,
        "timestamp": timestamp
        // "timeInForce": "GTC"
    };

    if (typeof flags.type !== 'undefined') data.type = flags.type;
    if (data.type.includes('LIMIT')) {
        data.price = price;
        if (data.type !== 'LIMIT_MAKER') {
            data.timeInForce = 'GTC';
        }
    }

    let query = makeQueryString(data);

    let signature = crypto.createHmac('sha256', APISECRET).update(query).digest('hex');
    const payload = {
        ...data,
        "signature": signature,
    };

    var config = {
        method: 'post',
        url: 'https://api.binance.com/api/v3/order',
        headers: {
            'X-MBX-APIKEY': APIKEY,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: payload
    };

    const result = await axios(config)
        .catch(function (error) {
            // console.log(error.response.data);
            return error.response;
        });
    return result.data;
}
async function CancelOrder(orderId, symbol) {
    const timestamp = Date.now();

    let data = {
        "orderId": orderId,
        "symbol": symbol,
        "timestamp": timestamp
    };

    let query = makeQueryString(data);

    let signature = crypto.createHmac('sha256', APISECRET).update(query).digest('hex');
    const payload = {
        ...data,
        "signature": signature,
    };

    var config = {
        method: 'DELETE',
        url: 'https://api.binance.com/api/v3/order',
        headers: {
            'X-MBX-APIKEY': APIKEY,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: payload
    };

    const result = await axios(config)
        .catch(function (error) {
            // console.log(error.response.data);
            return error.response;
        });
    return result.data;
}
async function openOrders(symbol) {
    // const timestamp = Date.now();

    // let data = {
    //     "symbol": symbol,
    //     "timestamp": timestamp
    // };

    // let query = makeQueryString(data);

    // let signature = crypto.createHmac('sha256', APISECRET).update(query).digest('hex');


    const headers = {};
    headers['X-MBX-APIKEY'] = APIKEY;
    const timestamp = Date.now();

    const data = {
        "symbol": symbol,
        "timestamp": timestamp,
    };

    let query = makeQueryString(data);
    let signature = crypto.createHmac('sha256', APISECRET).update(query).digest('hex');

    var config = {
        method: 'GET',
        url: 'https://api.binance.com/api/v3/openOrders?' + query + '&signature=' + signature,
        headers: headers
    };

    const result = await axios(config)
        .catch(function (error) {
            // console.log(error.response.data);
            return error.response;
        });
    return result.data;
}
async function getBalance(asset) {
    const headers = {};
    headers['X-MBX-APIKEY'] = APIKEY;
    const timestamp = Date.now();

    const data = {
        "timestamp": timestamp,
    };

    let query = makeQueryString(data);
    let signature = crypto.createHmac('sha256', APISECRET).update(query).digest('hex');
    // const signature = get_binanceus_signature("timestamp=" + timestamp);

    const getBalance = await axios.get("https://api.binance.com/api/v3/account?" + query + "&signature=" + signature, { headers: headers });
    let data_filter = getBalance.data.balances.filter(s => s.asset === asset)
    return parseFloat(data_filter[0].free);
}

async function roundStep(qty, stepSize) {
    if (Number.isInteger(qty)) return qty;
    const qtyString = parseFloat(qty).toFixed(16);
    // console.log("qtyString", qtyString);
    const desiredDecimals = Math.max(stepSize.indexOf('1') - 1, 0);
    const decimalIndex = qtyString.indexOf('.');
    return parseFloat(qtyString.slice(0, decimalIndex + desiredDecimals + 1));
}


module.exports = {
    prices,
    bookTickers,
    order,
    getBalance,
    roundStep,
    CancelOrder,
    openOrders,
    pricesAll
}