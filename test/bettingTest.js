/*
 *
 * Main tests
 *
 */
const Ae = require('@aeternity/aepp-sdk').Universal;
const Node = require('@aeternity/aepp-sdk').Node;
const Deployer = require('aeproject-lib').Deployer;
const BETTING_CONTRACT_PATH = "./contracts/BettingContract.aes";

const config = {
    host: "http://localhost:3001/",
    internalHost: "http://localhost:3001/internal/",
    compilerUrl: "http://localhost:3080"
};

describe('Betting Contract', () => {
    let deployer;
    let instance;
    let playerOneClient, playerTwoClient, playerThreeClient, playerFourClient;
    let ownerKeyPair = wallets[0];
    let playerOneKeyPair = wallets[1];
    let playerTwoKeyPair = wallets[2];
    let playerThreeKeyPair = wallets[3];
    let playerFourKeyPair = wallets[4];

    before(async () => {
        deployer = new Deployer('local', ownerKeyPair.secretKey)
        const node = await Node({ url: config.host })

        playerOneClient = await Ae({
            url: config.host,
            nodes: [{ name: 'local', instance: node }],
            internalUrl: config.internalHost,
            compilerUrl: config.compilerUrl,
            keypair: playerOneKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet'
        });

        playerTwoClient = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            compilerUrl: config.compilerUrl,
            keypair: playerTwoKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet'
        });

        playerThreeClient = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            compilerUrl: config.compilerUrl,
            keypair: playerThreeKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet'
        });

        playerFourClient = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            compilerUrl: config.compilerUrl,
            keypair: playerFourKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet'
        });
    })

    it('Deploying Betting Contract', async () => {
        deployedContractOwner = await deployer.deploy(BETTING_CONTRACT_PATH, ['home', 'away', 30])

        deployedContractPlayerOne = await deployedContractOwner.from(playerOneKeyPair.secretKey);
        deployedContractPlayerTwo = await deployedContractOwner.from(playerTwoKeyPair.secretKey);
        deployedContractPlayerThree = await deployedContractOwner.from(playerThreeKeyPair.secretKey);
        deployedContractPlayerFour = await deployedContractOwner.from(playerFourKeyPair.secretKey);

        await assert.isOk(deployedContractOwner, 'Could not deploy the Betting Smart Contract');

        instance = deployedContractOwner
    })

    it('Should check if home team exists', async () => {
        let exists = (await instance.team_exists('home')).decodedResult
        assert.isTrue(exists, 'team does not exists')
    })

    it('Should return false on unknown team', async () => {
        let exists = (await instance.team_exists('none')).decodedResult
        assert.isFalse(exists, 'team does exist?')
    })

    it('Should return false if player has not betted', async () => {
        let player = playerOneKeyPair.publicKey
        let exists = (await instance.player_exists(player)).decodedResult
        assert.isFalse(exists, 'player does exist?')
    })

    it('Players should be able to bet', async () => {
        playerOne = playerOneKeyPair.publicKey
        playerTwo = playerTwoKeyPair.publicKey
        playerFour = playerFourKeyPair.publicKey

        await deployedContractPlayerOne.bet('home', { amount: 30 })
        await deployedContractPlayerTwo.bet('away', { amount: 40 })
        await deployedContractPlayerFour.bet('home', { amount: 50 })

        let player_one_betted = (await instance.player_exists(playerOne)).decodedResult
        let player_two_betted = (await instance.player_exists(playerTwo)).decodedResult
        let player_four_betted = (await instance.player_exists(playerFour)).decodedResult

        assert.isTrue(player_one_betted, 'player one was not able to bet')
        assert.isTrue(player_two_betted, 'player two was not able to bet')
        assert.isTrue(player_four_betted, 'player four was not able to bet')
    })

    it('Should raise if player already betted', async () => {
         try {
            await deployedContractPlayerOne.bet('home', { amount: 30 })
            assert.fail();
        } catch (e) {
            console.log(e.decodedError);
        }
    })

    it('Should raise if player bets below minimum', async () => {
        try {
            await deployedContractPlayerThree.bet('home', { amount: 20 })
            assert.fail();
        } catch (e) {
            console.log(e.decodedError);
        }
    })

    it('Should maintain betting balance', async () => {
        let total_bets = (await instance.total_bets()).decodedResult
        let total = (await instance.total()).decodedResult
        let balance = new Map(total_bets)

        assert.equal(total, 120, 'colombians running the game')
        assert.equal(balance.get('away'), 40, 'away has shitty balance')
        assert.equal(balance.get('home'), 80, 'home has shitty balance')
    })

    it('Should raise if someone tries to settle', async () => {
        try {
            await deployedContractPlayerThree.settle('home')
            assert.fail();
        } catch (e) {
            console.log(e.decodedError);
        }
    })

    it('Should settle the bet', async () => {
        let player_one = playerOneKeyPair.publicKey
        let player_four = playerFourKeyPair.publicKey

        await instance.settle('home')

        let winners = (await instance.winners()).decodedResult

        console.log((await instance.total()).decodedResult)

        assert.include(winners, player_one, 'just got robbed')
        assert.include(winners, player_four, 'just got robbed')
    })

    it('Should raise if someone tries to bet if already settled', async () => {
        try {
            await deployedContractPlayerThree.bet('home', { amount: 30 })
            assert.fail();
        } catch (e) {
            console.log(e.decodedError);
        }
    })
})
