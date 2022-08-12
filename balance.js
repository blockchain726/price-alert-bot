const Web3 = require('web3')
const web3 = new Web3('https://bsc-dataseed4.ninicoin.io/')
const minABI = [
    // balanceOf
    {
    "constant":true,
    "inputs":[{"name":"_owner","type":"address"}],
    "name":"balanceOf",
    "outputs":[{"name":"balance","type":"uint256"}],
    "type":"function"
    },
    // decimals
    {
    "constant":true,
    "inputs":[],
    "name":"decimals",
    "outputs":[{"name":"","type":"uint8"}],
    "type":"function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "name",
      "outputs": [
          {
              "internalType": "string",
              "name": "",
              "type": "string"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [],
      "name": "symbol",
      "outputs": [
          {
              "internalType": "string",
              "name": "",
              "type": "string"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
];

const axios = require('axios').default;

module.exports = {
    getBalance: async (token_address, wallet_address)=> {
        let contract = new web3.eth.Contract(minABI, token_address)
        let balance = await contract.methods.balanceOf(wallet_address).call()
        let decimals = parseInt( await contract.methods.decimals().call() )
        return balance/(10**decimals)
    },
    getTokenPriceUSD: async (token_id)=> {
        var endpoint = "https://api.coingecko.com/api/v3/simple/price?ids=" + token_id + "&vs_currencies=usd"
        const response = await axios(endpoint)
        return response.data[token_id].usd
    }
}


