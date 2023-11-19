import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";
import {
  IndexSwap,
  PriceOracle,
  IERC20__factory,
  IndexSwapLibrary,
  Adapter,
  Rebalancing,
  AccessController,
  TokenMetadata,
  Vault,
  ERC20,
  VBep20Interface,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for IndexSwap", () => {
  let accounts;
  let priceOracle: PriceOracle;
  let indexSwap: IndexSwap;
  let indexSwapLibrary: IndexSwapLibrary;
  let adapter: Adapter;
  let rebalancing: Rebalancing;
  let tokenMetadata: TokenMetadata;
  let accessController: AccessController;
  let vault: Vault;
  let txObject;
  let owner: SignerWithAddress;
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

  const linkInstance = new ethers.Contract(
    addresses.LINK_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );

  describe("Tests for IndexSwap contract", () => {
    before(async () => {
      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, addr1, addr2, ...addrs] = accounts;

      const provider = ethers.getDefaultProvider();

      const Vault = await ethers.getContractFactory("Vault");
      vault = await Vault.deploy();
      await vault.deployed();
      console.log("Vault deployed to: ", vault.address);

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

      const AccessController = await ethers.getContractFactory(
        "AccessController"
      );
      accessController = await AccessController.deploy(owner.address);
      await accessController.deployed();

      const Adapter = await ethers.getContractFactory("Adapter");
      adapter = await Adapter.deploy();
      await adapter.deployed();
      adapter.init(
        accessController.address,
        addresses.PancakeSwapRouterAddress,
        vault.address,
        tokenMetadata.address,
        priceOracle.address
      );

      const IndexSwap = await ethers.getContractFactory("IndexSwap");
      indexSwap = await IndexSwap.deploy("INDEXLY", "IDX");
      await indexSwap.deployed();
      indexSwap.init(
        addresses.WETH_Address,
        vault.address,
        "500000000000000000000",
        "10000000000000000",
        indexSwapLibrary.address,
        adapter.address,
        accessController.address,
        tokenMetadata.address,
        "100",
        owner.address
      );

      const res = await accessController.hasRole(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        owner.address
      );

      // Grant IndexSwap index manager role
      await accessController
        .connect(owner)
        .setupRole(
          "0x1916b456004f332cd8a19679364ef4be668619658be72c17b7e86697c4ae0f16",
          indexSwap.address
        );

      const Rebalancing = await ethers.getContractFactory("Rebalancing");
      rebalancing = await Rebalancing.deploy();
      await rebalancing.deployed();
      rebalancing.init(
        indexSwap.address,
        indexSwapLibrary.address,
        adapter.address,
        accessController.address,
        tokenMetadata.address
      );

      // Grant owner asset manager admin role
      await accessController.setupRole(
        "0x15900ee5215ef76a9f5d2b8a5ec2fe469c362cbf4d7bef6646ab417b6d169e88",
        owner.address
      );

      // Grant owner asset manager role
      await accessController.setupRole(
        "0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819",
        owner.address
      );

      // Grant rebalancing index manager role
      await accessController.setupRole(
        "0x1916b456004f332cd8a19679364ef4be668619658be72c17b7e86697c4ae0f16",
        rebalancing.address
      );

      // Grant rebalancing rebalancer contract role
      await accessController.setupRole(
        "0x8e73530dd444215065cdf478f826e993aeb5e2798587f0bbf5a978bd97df63ea",
        rebalancing.address
      );

      await vault.transferOwnership(adapter.address);

      console.log("indexSwap deployed to:", indexSwap.address);
    });

    describe("IndexSwap Contract", function () {
      it("should check Index token name and symbol", async () => {
        expect(await indexSwap.name()).to.eq("INDEXLY");
        expect(await indexSwap.symbol()).to.eq("IDX");
      });
      it("initialize should revert if total Weights not equal 10,000", async () => {
        await expect(
          indexSwap.initToken(
            [dogeInstance.address, wbnbInstance.address],
            [100, 1000]
          )
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });
      it("Initialize IndexFund Tokens", async () => {
        await indexSwap.initToken(
          [dogeInstance.address, ethInstance.address],
          [5000, 5000]
        );
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8"
        );
        const vETHBalanceBefore = await VBep20Interface.balanceOf(
          vault.address
        );

        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund("200", {
          value: "100000000000000000",
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(
          Number(indexSupplyBefore)
        );

        const vETHBalanceAfter = await VBep20Interface.balanceOf(vault.address);

        expect(Number(vETHBalanceAfter)).to.be.greaterThan(
          Number(vETHBalanceBefore)
        );
      });

      it("Invest 0.00001 BNB into Top10 fund should fail", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.2bnb before", indexSupplyBefore);
        await expect(
          indexSwap.investInFund("200", {
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
        await indexSwap.investInFund("200", {
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
        await indexSwap.investInFund("200", {
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
        const vETHBalanceAfter = await VBep20Interface.balanceOf(vault.address);
      });

      it("Investment should fail when contract is paused", async () => {
        await rebalancing.setPause(true);
        await expect(
          indexSwap.investInFund("200", {
            value: "1000000000000000000",
          })
        ).to.be.reverted;
      });

      it("update Weights should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateWeights([6667, 3330], "200")
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

        await rebalancing.updateWeights([6667, 3333], "200");

        const vETHBalance = await VBep20Interface.balanceOf(vault.address);
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([5000, 5000], "200");
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([3333, 6667], "200");
      });

      it("should charge fees and treasury balance should increase", async () => {
        const ERC20 = await ethers.getContractFactory("ERC20");
        const token = ERC20.attach(ethInstance.address);

        const balanceBefore = await token.balanceOf(owner.address);

        const fee = await rebalancing.feeModule();
        const receipt = await fee.wait();

        let amount;

        if (receipt.events && receipt.events.length > 0) {
          const lastElement = receipt.events[receipt.events.length - 1];

          if (lastElement.args) {
            amount = lastElement.args.amount;
          }
        }

        const balance = await token.balanceOf(owner.address);

        expect(Number(balance)).to.be.greaterThanOrEqual(Number(amount));
        expect(Number(balance)).to.be.greaterThanOrEqual(Number(balanceBefore));
      });

      it("updateTokens should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateTokens(
            [ethInstance.address, daiInstance.address, wbnbInstance.address],
            [2000, 6000, 1000],
            "200"
          )
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });

      it("owner should be able to add asset manager", async () => {
        await accessController.setupRole(
          "0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819",
          nonOwner.address
        );
      });

      it("non owner should not be able to add asset manager", async () => {
        await expect(
          accessController
            .connect(nonOwner)
            .setupRole(
              "0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819",
              investor1.address
            )
        ).to.be.revertedWith("Caller is not Role Admin!");
      });

      it("new asset manager should update tokens", async () => {
        // current = BUSD:ETH = 1:2
        // target = ETH:DAI:WBNB = 1:3:1

        let beforeTokenXBalance;
        let beforeVaultValue;

        await rebalancing
          .connect(nonOwner)
          .updateTokens(
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
          indexSwap.withdrawFund(AMOUNT, "200", false)
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
          indexSwap.connect(nonOwner).withdrawFund(AMOUNT, "200", false)
        ).to.be.revertedWith("caller is not holding given token amount");
      });

      it("should fail withdraw when balance falls below min investment amount", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await expect(
          indexSwap.withdrawFund(AMOUNT.sub("1000000000000"), "200", false)
        ).to.be.revertedWith(
          "Balance cannot be below minimum investment amount!"
        );
      });

      it("should fail withdraw when balance falls below min investment amount (multi asset)", async () => {
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
