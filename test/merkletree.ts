import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export const leafHash = (address: string): string => {
  return ethers.utils.solidityKeccak256(["bytes1", "address"], [0, address]);
};

export const nodeHash = (lhs: string, rhs: string): string => {
  if (!lhs) { return rhs; }
  if (!rhs) { return lhs; }

  const pairSorted = BigNumber.from(lhs).lt(BigNumber.from(rhs)) ? [lhs, rhs] : [rhs, lhs];
  return ethers.utils.solidityKeccak256(["bytes1", "bytes32", "bytes32"], [1, ...pairSorted]);
};

export default class MerkleTree {
  leaves: string[];
  layers: string[][];

  constructor (elements: string[]) {
    this.leaves = elements.filter(el => el).map(leafHash);

    this.layers = this.getLayers(this.leaves);
  }

  getLayers(leaves: string[]): string[][] {
    if (leaves.length === 0) {
      return [[""]];
    }

    const layers = [];
    layers.push(leaves);
    while(layers[layers.length - 1].length > 1) {
      layers.push(this._getNextLayer(layers[layers.length - 1]));
    }

    return layers;
  }

  getHexRoot(): string {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(address: string): string[] {
    
    const idx = this.leaves.indexOf(leafHash(address));
    if (idx === -1) {
      throw new Error(`Element (${address}, ${leafHash(address)}) does not exist in Merkle tree`);
    }

    return this._proofFromIndex(idx);
  }

  randomProof(): string[] {
    const idx = Math.floor(Math.random() * this.leaves.length);
    return this._proofFromIndex(idx);
  }

  _proofFromIndex(idx: number): string[] {
    return this.layers.reduce((proof, layer) => {
      const pairElement = this._getPairElement(idx, layer);

      if (pairElement) {
        proof.push(pairElement);
      }

      idx = Math.floor(idx / 2);
    
      return proof;
    }, []);
  }

  _getNextLayer(hashes: string[]): string[] {
    return hashes.reduce<string[]>((layer, el, idx, arr) => {
      if (idx % 2 === 0) {
        layer.push(nodeHash(el, arr[idx + 1]));
      }

      return layer;
    }, []);
  }

  _getPairElement(idx: number, layer: string[]): string | undefined {
    const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (pairIdx < layer.length) {
      return layer[pairIdx];
    } else {
      return undefined;
    }
  }
}