# Diagrams

Code path diagrams are useful for understanding how things work.

## Play diagram

The main play loop

```
Game:
    - startHand
    ^   +- dealTiles -> dealTileToPlayer
    |   |
    |   +- preparePlay -> resolveKongs
    |   |
    |   `- play <-----------------------------------------------------+---,
    |      ^  |                                                       |   |
    |      |  +- dealTile                                             |   |
    |      |  +- getDiscard -------------(no discard)--> processWin --'   |
    |      |  |    ^  |                                                   |
    |      |  |    |  +-resolve kong declaration                          |
    |      |  |    |  |                                                   |
    |      |  |    `--'                                                   |
    |      |  +- processDiscard                                           |
    |      |  +- getAllClaims -------------(claim)-----> processClaim ----'
    |    no|  |
    |      `--+ "wall exhausted?"
    `---------'
        yes
```
