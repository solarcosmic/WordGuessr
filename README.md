<img width="1920" height="534" alt="wordguessr_banner" src="https://github.com/user-attachments/assets/6b25cdfe-72f3-43d9-a248-88adc02369e0" />

# WordGuessr
Challenge opponents to fill in the word the fastest!

WordGuessr uses a dataset of about 24,000 quotes. You can view the dataset on [Hugging Face here](https://huggingface.co/datasets/m-ric/english_historical_quotes);

## How It Works
1. Players join up, choosing a name.
2. All players ready up by clicking the blue "ready" button next to their name.
3. Players have to try guess the blank word from 16 quotes within 2 minutes.
4. Hints are given throughout the questions to make it easier.
5. Once everybody has finished the game, results are shown on a leaderboard! First to complete the most and in the shortest amount of time wins!

## How to Host
WordGuessr requires Node.js (latest) and npm (preferably latest). Dependencies are required: `npm install express http socket.io js-yaml`

By default, WordGuessr hosts the server on port 8080, however this can be changed in settings.yml.