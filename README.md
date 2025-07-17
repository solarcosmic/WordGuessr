<img width="1920" height="534" alt="wordguessr_banner" src="https://github.com/user-attachments/assets/6b25cdfe-72f3-43d9-a248-88adc02369e0" />

# WordGuessr
Challenge opponents to fill in the word the fastest!
[Demo Link](http://node01.solarcosmic.net:1905/)

WordGuessr uses a dataset of about 24,000 quotes. You can view the dataset on [Hugging Face here](https://huggingface.co/datasets/m-ric/english_historical_quotes).

You can try the demo [here](http://node01.solarcosmic.net:1905/), although it is best run locally to avoid ping issues.

## How It Works
1. Players join up, choosing a name.
2. All players ready up by clicking the blue "ready" button next to their name.
3. Players have to try guess the blank word from 8 quotes within 2 minutes.
4. Hints are given throughout the questions to make it easier.
5. Once everybody has finished the game, results are shown on a leaderboard! First to complete the most and in the shortest amount of time wins!

## How to Host
> This guide expects you to have an intermediate/advanced understanding of using computers and the terminal.

WordGuessr requires Node.js (latest) and npm (preferably latest).
1. To download Node.js and npm, [click here](https://nodejs.org/en/download).
2. Once Node.js and npm are installed, you'll want to download WordGuessr. [Click here](https://github.com/solarcosmic/WordGuessr/archive/refs/heads/main.zip) to download it as a .zip. (Cloning the GitHub repository works too).
3. Using your favourite archive extractor, extract the .zip file you have just downloaded to its folder, for example:
    - Right click on .zip > "Extract to wordguessr\\". (7-Zip, WinRAR)
Note that there may be another folder (e.g. "WordGuessr-main"), just navigate inside that folder for the below instructions.

### Windows-specific instructions
4. In File Explorer, navigate inside that newly created folder, and where it has the navigation path (see below) remove the contents of the text and type `cmd`.
<img width="899" height="210" alt="image" src="https://github.com/user-attachments/assets/31a69d78-ece5-4848-80d6-cdfb3ef08fb3" />

6. Then, run `npm i` to install the required dependencies, and when you want to run the server, run `node server.js`.

### macOS/Linux specific instructions
> This assumes you have some basic terminal knowledge.
4. Open a terminal, and change the directory to the newly created WordGuessr folder.
5. Then, run `npm i` to install the required dependencies, and when you want to run the server, run `node server.js`.

By default, WordGuessr hosts the server on port 8080, this can be changed in `settings.yml`. When you make changes to it, feel free to restart the server.

Happy guessing!
