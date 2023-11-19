import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";
import {
  PriceOracle,
  IERC20__factory,
  TokenMetadata,
  IndexSwapLibrary,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for priceOracle", () => {
  let accounts;
  let priceOracle: PriceOracle;
  let tokenMetadata: TokenMetadata;
  let indexSwapLibrary: IndexSwapLibrary;
  let owner: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr1: SignerWithAddress;
  let vault: SignerWithAddress;
  let addrs: SignerWithAddress[];
  //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];
  let safeAddress = "0x";

  const wbnbInstance = new ethers.Contract(
    addresses.WETH_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );
  const busdInstance = new ethers.Contract(
    addresses.BUSD,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );
  const daiInstance = new ethers.Contract(
    addresses.DAI_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );
  const ethInstance = new ethers.Contract(
    addresses.ETH_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );
  const btcInstance = new ethers.Contract(
    addresses.BTC_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );
  const dogeInstance = new ethers.Contract(
    addresses.DOGE_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );

  const linkInstance = new ethers.Contract(
    addresses.LINK_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );

  describe("Tests for priceOracle contract", () => {
    before(async () => {
      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, vault, addr1, addr2, ...addrs] = accounts;

      const PriceOracle = await ethers.getContractFactory("PriceOracle");
      priceOracle = await PriceOracle.deploy();
      await priceOracle.deployed();

      await priceOracle._addFeed(
        wbnbInstance.address,
        "0x0000000000000000000000000000000000000348",
        "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE"
      ); // WBNB / USD

      await priceOracle._addFeed(
        busdInstance.address,
        "0x0000000000000000000000000000000000000348",
        "0xcBb98864Ef56E9042e7d2efef76141f15731B82f"
      ); // BUSD / USD

      await priceOracle._addFeed(
        daiInstance.address,
        "0x0000000000000000000000000000000000000348",
        "0x132d3C0B1D2cEa0BC552588063bdBb210FDeecfA"
      ); // DAI / USD

      await priceOracle._addFeed(
        ethInstance.address,
        "0x0000000000000000000000000000000000000348",
        "0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e"
      ); // ETH / USD

      await priceOracle._addFeed(
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "0x0000000000000000000000000000000000000348",
        "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE"
      ); // ETH / USD (default)

      await priceOracle._addFeed(
        "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
        "0x0000000000000000000000000000000000000348",
        "0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf"
      ); // BTC / USD

      await priceOracle._addFeed(
        dogeInstance.address,
        "0x0000000000000000000000000000000000000348",
        "0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8"
      ); // DOGE / USD

      await priceOracle._addFeed(
        ethInstance.address,
        wbnbInstance.address,
        "0x63D407F32Aa72E63C7209ce1c2F5dA40b3AaE726"
      ); // ETH / WBNB

      await priceOracle._addFeed(
        "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
        ethInstance.address,
        "0xf1769eB4D1943AF02ab1096D7893759F6177D6B8"
      ); // BTC / ETH

      await priceOracle._addFeed(
        busdInstance.address,
        wbnbInstance.address,
        "0x87Ea38c9F24264Ec1Fff41B04ec94a97Caf99941"
      ); // BUSD / BNB

      const TokenMetadata = await ethers.getContractFactory("TokenMetadata");
      tokenMetadata = await TokenMetadata.deploy();
      await tokenMetadata.deployed();

      if (chainId == "56") {
        tokenMetadata.add(
          ethInstance.address,
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8"
        );

        tokenMetadata.addBNB();
      }

      const IndexSwapLibrary = await ethers.getContractFactory(
        "IndexSwapLibrary"
      );
      indexSwapLibrary = await IndexSwapLibrary.deploy(
        priceOracle.address,
        addresses.WETH_Address,
        tokenMetadata.address
      );
      await indexSwapLibrary.deployed();
    });

    describe("priceOracle Contract", function () {
      it("Get ETH/WBNB price", async () => {
        const price = await priceOracle.getPrice(
          ethInstance.address,
          wbnbInstance.address
        );
        console.log(price);
      });
      it("Get BTC/ETH price", async () => {
        const price = await priceOracle.getPrice(
          "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
          ethInstance.address
        );
        console.log(price);
      });

      it("Get BUSD/WBNB price", async () => {
        const price = await priceOracle.getPrice(
          busdInstance.address,
          wbnbInstance.address
        );
        console.log(price);
      });

      it("Get BTC/USD price", async () => {
        const price = await priceOracle.getPrice(
          "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
          "0x0000000000000000000000000000000000000348"
        );
        console.log(price);
      });

      it("Get BTC/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD(
          "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
          "1000000000000000000"
        );
        console.log(price);
      });

      it("Get ETH/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD(
          ethInstance.address,
          "1000000000000000000"
        );
        console.log(price);
      });

      it("Get BUSD/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD(
          busdInstance.address,
          "1000000000000000000"
        );
        console.log(price);
      });

      it("Get DAI/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD(
          daiInstance.address,
          "1000000000000000000"
        );
        console.log(price);
      });

      it("Get WBNB/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD(
          wbnbInstance.address,
          "1000000000000000000"
        );
        console.log(price);
      });

      it("Get DOGE/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD(
          dogeInstance.address,
          "1000000000000000000"
        );
        console.log(price);
      });

      it("Get USD/WBNB price", async () => {
        const price = await priceOracle.getUsdEthPrice("1000000000000000000");
        console.log(price);
      });

      it("Get USD/WBNB price", async () => {
        const price = await indexSwapLibrary._getTokenPriceUSDETH(
          "1000000000000000000"
        );
        console.log(price);
      });

      it("Get BTC/WETH price", async () => {
        const price = await priceOracle.getPriceForAmount(
          btcInstance.address,
          "1000000000000000000",
          true
        );
        console.log(price);
      });

      it("Get WETH/BTC price", async () => {
        const price = await priceOracle.getPriceForAmount(
          btcInstance.address,
          "1000000000000000000",
          false
        );
        console.log(price);
      });

      it("Get ETH/WETH price", async () => {
        const price = await priceOracle.getPriceForAmount(
          ethInstance.address,
          "1000000000000000000",
          true
        );
        console.log(price);
      });

      it("Get WETH/ETH price", async () => {
        const price = await priceOracle.getPriceForAmount(
          ethInstance.address,
          "1000000000000000000",
          false
        );
        console.log(price);
      });

      it("Get DOGE/WETH price", async () => {
        const price = await priceOracle.getPriceForAmount(
          dogeInstance.address,
          "1000000000000000000",
          true
        );
        console.log(price);
      });

      it("Get WETH/DOGE price", async () => {
        const price = await priceOracle.getPriceForAmount(
          dogeInstance.address,
          "1000000000000000000",
          false
        );
        console.log(price);
      });

      //
    });
  });
});
