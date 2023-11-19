pragma solidity 0.8.19;

import { Safe } from "@safe-global/safe-contracts/contracts/Safe.sol";
import { SafeProxy } from "@safe-global/safe-contracts/contracts/SafeProxy/SafeProxy.sol";
import { MultiSend } from "@safe-global/safe-contracts/contracts/libraries/MultiSend.sol";
import { Module } from "@gnosis.pm/zodiac/contracts/core/Module.sol";
import { SafeProxyFactory } from "@safe-global/safe-contracts/contracts/SafeProxy/SafeProxyFactory.sol";
import { WaletAASafeModule } from "../vault/WaletAASafeModule.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { ErrorLibrary } from "./ErrorLibrary.sol";

library SafeDeployer {
    struct DeploymentConfig {
        address gnosisSingleton;
        address gnosisSafeProxyFactory;
        address gnosisMultisendLibrary;
        address gnosisFallbackLibrary;
        address baseGnosisModule;
        address[] owners;
        uint256 threshold;
    }

    function deployGnosisSafeAndModule(
        DeploymentConfig memory config
    ) internal returns (address gnosisSafe, address velvetModule) {
        SafeProxyFactory factoryInstance = SafeProxyFactory(config.gnosisSafeProxyFactory);
        SafeProxy safeProxyAddress = factoryInstance.createProxyWithNonce(config.gnosisSingleton, bytes(""), 1234);
        Safe _safe = Safe(payable(safeProxyAddress));    
        WaletAASafeModule _gnosisModule = WaletAASafeModule(Clones.clone(config.baseGnosisModule));
        bytes memory _multisendAction = generateByteCode(address(_safe), address(_gnosisModule));

        _safe.setup(
            config.owners,
            config.threshold,
            config.gnosisMultisendLibrary,
            _multisendAction,
            config.gnosisFallbackLibrary,
            address(0),
            0,
            payable(address(0))
        );

        gnosisSafe = address(_safe);
        velvetModule = address(_gnosisModule);

        if (!_safe.isModuleEnabled(velvetModule)) {
            revert ErrorLibrary.ModuleNotInitialised();
        }

        return (gnosisSafe, velvetModule);
    }

    function generateByteCode(
        address _safe,
        address _gnosisModule
    ) internal pure returns (bytes memory _multisendAction) {
        bytes memory _enableSafeModule = abi.encodeWithSignature("enableModule(address)", _gnosisModule);
        bytes memory _enableVelvetMultisend = abi.encodePacked(
            uint8(0),
            _safe,
            uint256(0),
            uint256(_enableSafeModule.length),
            _enableSafeModule
        );
        _multisendAction = abi.encodeWithSignature("multiSend(bytes)", _enableVelvetMultisend);
    }
}
