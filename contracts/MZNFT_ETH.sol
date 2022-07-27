// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract MZNFT_ETH is ERC721{
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    struct Item {
        uint256 id;
        string name;
        address creator;
        string img_uri;//metadata url
    }

    mapping(uint256 => Item) public Items; //id => Item

    constructor () ERC721("MZNFT_ETH", "MZNFT_ETH") {}

    function mint(address creator, string memory uri, string memory contentName) public returns (uint256){
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(creator, newItemId);
        //approve(marketplace, newItemId);

        Items[newItemId] = Item({
        id: newItemId,
        name: contentName,
        creator: creator,
        img_uri: uri
        });

        return newItemId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721URIStorage: URI query for nonexistent token");
        return Items[tokenId].img_uri;
    }

    function getItem(uint256 tokenId) public view returns (Item memory) {
        require(_exists(tokenId), "ERC721URIStorage: URI query for nonexistent token");
        return Items[tokenId];
    }

}