import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import {
  IndexSwap,
  IndexSwap__factory,
  PriceOracle,
  IERC20__factory,
  IndexSwapLibrary,
  Adapter,
  Rebalancing__factory,
  Rebalancing,
  AccessController,
  TokenMetadata,
  IndexFactory,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for IndexFactory", () => {
  let accounts;
  let priceOracle: PriceOracle;
  let indexSwap: any;
  let indexSwapLibrary: IndexSwapLibrary;
  let indexFactory: IndexFactory;
  let adapter: Adapter;
  let rebalancing: any;
  let tokenMetadata: TokenMetadata;
  let accessController: AccessController;
  let txObject;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addrs: SignerWithAddress[];
  //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  console.log(chainId, "chainId");
  const addresses = chainIdToAddresses[chainId];

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

  describe.only("Tests for IndexFactory contract", () => {
    before(async () => {
      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, treasury, addr1, addr2, ...addrs] = accounts;

      const provider = ethers.getDefaultProvider();

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

      await priceOracle._addFeed(
        dogeInstance.address,
        "0x0000000000000000000000000000000000000348",
        "0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8"
      ); // DOGE / USD

      const TokenMetadata = await ethers.getContractFactory("TokenMetadata");
      tokenMetadata = await TokenMetadata.deploy();
      await tokenMetadata.deployed();

      const IndexSwapLibrary = await ethers.getContractFactory(
        "IndexSwapLibrary"
      );
      indexSwapLibrary = await IndexSwapLibrary.deploy(
        priceOracle.address,
        addresses.WETH_Address,
        tokenMetadata.address
      );
      await indexSwapLibrary.deployed();

      const Adapter = await ethers.getContractFactory("Adapter");
      adapter = await Adapter.deploy();
      await adapter.deployed();

      const Rebalancing = await ethers.getContractFactory("Rebalancing");
      const rebalancingDefult = await Rebalancing.deploy();
      await rebalancingDefult.deployed();

      const IndexFactory = await ethers.getContractFactory("IndexFactory");
      indexFactory = await IndexFactory.deploy(
        addresses.PancakeSwapRouterAddress,
        addresses.WETH_Address,
        treasury.address,
        indexSwapLibrary.address,
        tokenMetadata.address,
        adapter.address,
        rebalancingDefult.address
      );

      if (chainId == "56") {
        tokenMetadata.add(
          ethInstance.address,
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8"
        );

        tokenMetadata.addBNB();
      }

      const indexFactoryCreate = await indexFactory.createIndex(
        "INDEXLY",
        "IDX",
        "500000000000000000000",
        "10000000000000000",
        "100",
        false,
        priceOracle.address
      );

      const indexAddress = await indexFactory.getIndexList(0);
      const indexInfo = await indexFactory.IndexSwapInfolList(0);

      console.log(indexAddress, "indexSwapAddress");
      indexSwap = await ethers.getContractAt(
        IndexSwap__factory.abi,
        indexAddress
      );
      rebalancing = await ethers.getContractAt(
        Rebalancing__factory.abi,
        indexInfo.rebalancing
      );

      console.log("indexSwap deployed to:", indexSwap.address);
    });

    describe("IndexFactory Contract", function () {
      it("should check Index token name and symbol", async () => {
        expect(await indexSwap.name()).to.eq("INDEXLY");
        expect(await indexSwap.symbol()).to.eq("IDX");
      });
      it("initialize should revert if total Weights not equal 10,000", async () => {
        await expect(
          indexFactory.initializeTokens(
            0,
            [busdInstance.address, ethInstance.address],
            [100, 1000]
          )
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });
      it("Initialize IndexFund Tokens", async () => {
        await indexFactory.initializeTokens(
          0,
          [dogeInstance.address, ethInstance.address],
          [5000, 5000]
        );
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8"
        );

        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund("100", {
          value: "100000000000000000",
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(
          Number(indexSupplyBefore)
        );
      });

      it("Invest 0.00001 BNB into Top10 fund should fail", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.2bnb before", indexSupplyBefore);
        await expect(
          indexSwap.investInFund("100", {
            value: "10000000000000",
          })
        ).to.be.revertedWith("Wrong investment amount!");
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(
          Number(indexSupplyBefore)
        );
      });

      it("Invest 2BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.2bnb before", indexSupplyBefore);
        await indexSwap.investInFund("100", {
          value: "2000000000000000000",
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(
          Number(indexSupplyBefore)
        );
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund("100", {
          value: "1000000000000000000",
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        //console.log("1bnb after", indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(
          Number(indexSupplyBefore)
        );
        console.log(indexSupplyAfter);

        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8"
        );
      });

      it("Investment should fail when contract is paused", async () => {
        await rebalancing.setPause(true);
        await expect(
          indexSwap.investInFund("100", {
            value: "1000000000000000000",
          })
        ).to.be.reverted;
      });

      it("update Weights should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateWeights([6667, 3330], "100")
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });

      it("should revert to charge fees", async () => {
        await expect(rebalancing.feeModule()).to.be.revertedWith(
          "Fee has already been charged after the last rebalancing!"
        );
      });

      it("should Update Weights and Rebalance", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8"
        );

        await rebalancing.updateWeights([6667, 3333], "100");
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([5000, 5000], "100");
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([3333, 6667], "100");
      });

      it("should charge fees and treasury balance should increase", async () => {
        const ERC20 = await ethers.getContractFactory("ERC20");
        const token = ERC20.attach(ethInstance.address);

        const balanceBefore = await token.balanceOf(treasury.address);

        const fee = await rebalancing.feeModule();
        const receipt = await fee.wait();

        let amount;

        if (receipt.events && receipt.events.length > 0) {
          const lastElement = receipt.events[receipt.events.length - 1];

          if (lastElement.args) {
            amount = lastElement.args.amount;
          }
        }

        const balance = await token.balanceOf(treasury.address);

        expect(Number(balance)).to.be.greaterThanOrEqual(Number(amount));
        expect(Number(balance)).to.be.greaterThanOrEqual(Number(balanceBefore));
      });

      it("updateTokens should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateTokens(
            [ethInstance.address, daiInstance.address, wbnbInstance.address],
            [2000, 6000, 1000],
            "100"
          )
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });
      it("Non Rebalancing access address calling update function", async () => {
        let beforeTokenXBalance;
        let beforeVaultValue;

        await expect(
          indexSwap.updateRecords(
            [ethInstance.address, daiInstance.address, wbnbInstance.address],
            [2000, 6000, 2000]
          )
        ).to.be.revertedWith("Caller is not an Rebalancer Contract");
      });
      it("should update tokens", async () => {
        // current = BUSD:ETH = 1:2
        // target = ETH:DAI:WBNB = 1:3:1

        let beforeTokenXBalance;
        let beforeVaultValue;

        await rebalancing.updateTokens(
          [ethInstance.address, daiInstance.address, wbnbInstance.address],
          [2000, 6000, 2000],
          "200"
        );
      });

      it("withdrawal should revert when contract is paused", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const updateAmount = parseInt(amountIndexToken.toString()) + 1;
        const AMOUNT = ethers.BigNumber.from(updateAmount.toString()); //

        await expect(
          indexSwap.withdrawFund(AMOUNT, "100", false)
        ).to.be.revertedWith("The contract is paused !");
      });

      it("should unpause", async () => {
        await rebalancing.setPause(false);
      });

      it("should pause", async () => {
        await rebalancing.setPause(true);
      });

      it("should revert unpause", async () => {
        await expect(
          rebalancing.connect(addr1).setPause(false)
        ).to.be.revertedWith(
          "10 minutes have to pass or rebalancing has to be called!"
        );
      });

      it("should unpause", async () => {
        await ethers.provider.send("evm_increaseTime", [600]);
        await rebalancing.connect(addr1).setPause(false);
      });

      it("when withdraw fund more then balance", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const updateAmount = parseInt(amountIndexToken.toString()) + 1;
        const AMOUNT = ethers.BigNumber.from(updateAmount.toString()); //

        await expect(
          indexSwap.connect(nonOwner).withdrawFund(AMOUNT, "100", false)
        ).to.be.revertedWith("caller is not holding given token amount");
      });

      it("should fail withdraw when balance falls below min investment amount", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await expect(
          indexSwap.withdrawFund(AMOUNT.sub("1000000000000"), "100", false)
        ).to.be.revertedWith(
          "Balance cannot be below minimum investment amount!"
        );
      });

      it("should fail withdraw when balance falls below min investment amount", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await expect(
          indexSwap.withdrawFund(AMOUNT.sub("1000000000000"), "100", true)
        ).to.be.revertedWith(
          "Balance cannot be below minimum investment amount!"
        );
      });

      it("should withdraw fund and burn index token successfully", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap.withdrawFund(AMOUNT, "100", false);

        expect(txObject.confirmations).to.equal(1);
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        await indexSwap.investInFund("100", {
          value: "100000000000000000",
        });
      });

      it("should withdraw tokens directly instead of BNB", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap.withdrawFund(AMOUNT, "100", true);
      });
    });
  });
});
