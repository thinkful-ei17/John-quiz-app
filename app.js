class Store {
    constructor() {
        this.store = this._getInitialStore();
    }

    _getInitialStore() {
        return {
            page: 'intro',
            currentQuestionIndex: null,
            userAnswers: [],
            feedback: null,
        };
    }

    getScore() {
        return this.store.userAnswers.reduce((accumulator, userAnswer, index) => {
            const question = this.getQuestion(index);

            if (question.correctAnswer === userAnswer) {
                return accumulator + 1;
            } else {
                return accumulator;
            }
        }, 0);
    }

    getProgress() {
        return {
            current: this.store.currentQuestionIndex + 1,
            total: questionList.QUESTIONS.length
        };
    }

    getCurrentQuestion() {
        return questionList.QUESTIONS[this.store.currentQuestionIndex];
    }

    getQuestion(index) {
        return questionList.QUESTIONS[index];
    }

}

class API {
    constructor() {
        this.sessionToken = null;
    }

    _buildTokenUrl() {
        return new URL(this.BASE_API_URL + '/api_token.php');
    }

    _fetchQuestions(amt, query, callback) {
        $.getJSON(this._buildBaseUrl(amt, query), callback, err => console.log(err.message));
    }

    _fetchToken(callback) {
        if (this.sessionToken) {
            return callback();
        }

        const url = this._buildTokenUrl();
        url.searchParams.set('command', 'request');

        $.getJSON(url, res => {
            this.sessionToken = res.token;
            console.log(this.sessionToken);
            callback();
        }, err => console.log(err));
    }

    _buildBaseUrl(amt = 10, query = {}) {
        const url = new URL(this.BASE_API_URL + '/api.php');
        const queryKeys = Object.keys(query);
        url.searchParams.set('amount', amt);

        if (this.sessionToken) {
            url.searchParams.set('token', this.sessionToken);
        }

        queryKeys.forEach(key => url.searchParams.set(key, query[key]));
        return url;
    }
}

API.prototype.BASE_API_URL = 'https://opentdb.com';

class buildQuestion {
    constructor() {
        this.QUESTIONS = [];
    }
    _createQuestion(question) {
        // Copy incorrect_answers array into new all answers array
        const answers = [...question.incorrect_answers];

        // Pick random index from total answers length (incorrect_answers length + 1 correct_answer)
        const randomIndex = Math.floor(Math.random() * (question.incorrect_answers.length + 1));

        // Insert correct answer at random place
        answers.splice(randomIndex, 0, question.correct_answer);

        return {
            text: question.question,
            correctAnswer: question.correct_answer,
            answers
        };
    }

    _seedQuestions(questions) {
        this.QUESTIONS.length = 0;
        questions.forEach(q => this.QUESTIONS.push(this._createQuestion(q)));
    }

    fetchAndSeedQuestions(amt, query, callback) {
        quiz._fetchQuestions(amt, query, res => {
            this._seedQuestions(res.results);
            callback();
        });
    }
}


class quizRender {
    constructor() {
        this.TOP_LEVEL_COMPONENTS = [
            'js-intro', 'js-question', 'js-question-feedback',
            'js-outro', 'js-quiz-status'
        ];
    }

    _hideAll() {
        this.TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
    }
    render() {
        let html;
        this._hideAll();

        const question = newStore.getCurrentQuestion();
        const {
            feedback
        } = newStore.store;
        const {
            current,
            total
        } = newStore.getProgress();

        $('.js-score').html(`<span>Score: ${newStore.getScore()}</span>`);
        $('.js-progress').html(`<span>Question ${current} of ${total}`);

        switch (newStore.store.page) {
            case 'intro':
                if (quiz.sessionToken) {
                    $('.js-start').attr('disabled', false);
                }

                $('.js-intro').show();
                $('.js-progress').hide();
                $('.js-score').hide();
                break;

            case 'question':
                html = newGenerator.generateQuestionHtml(question);
                $('.js-question').html(html);
                $('.js-question').show();
                $('.quiz-status').show();
                $('.js-progress').show();
                $('.js-score').show();
                break;

            case 'answer':
                html = newGenerator.generateFeedbackHtml(feedback);
                $('.js-question-feedback').html(html);
                $('.js-question-feedback').show();
                $('.quiz-status').show();
                $('.js-progress').show();
                $('.js-score').show();
                break;

            case 'outro':
                $('.js-outro').show();
                $('.quiz-status').show();
                break;

            default:
                return;
        }
    }

    handleStartQuiz() {
        newStore.store = newStore._getInitialStore();
        newStore.store.page = 'question';
        newStore.store.currentQuestionIndex = 0;
        const quantity = parseInt($('#js-question-quantity').find(':selected').val(), 10);
        questionList.fetchAndSeedQuestions(quantity, {
            type: 'multiple'
        }, () => {
            newRender.render();
        });
    }

    handleRestartQuiz() {
        newStore.store.page = 'intro';
        newRender.render();
    }

    handleSubmitAnswer(e) {
        e.preventDefault();
        const question = newStore.getCurrentQuestion();
        const selected = $('input:checked').val();
        newStore.store.userAnswers.push(selected);

        if (selected === question.correctAnswer) {
            newStore.store.feedback = '<div class ="correct">You got it!</div>';
        } else {
            newStore.store.feedback = `<div class ="wrong">Too bad! The correct answer was: ${question.correctAnswer}</div>`;
        }

        newStore.store.page = 'answer';
        newRender.render();
    }

    handleNextQuestion() {
        if (newStore.store.currentQuestionIndex === questionList.QUESTIONS.length - 1) {
            newStore.store.page = 'outro';
            newRender.render();
            return;
        }

        newStore.store.currentQuestionIndex++;
        newStore.store.page = 'question';
        newRender.render();
    }
}

class Generator {
    generateAnswerItemHtml(answer) {
        return `<div class ="answers"><input type="radio" value="${answer}" name="answerChoice">
        <label for="answer"><span><span></span></span>${answer}</label></div>`;
    }

    generateQuestionHtml(question) {
        const answers = question.answers
            .map((answer, index) => this.generateAnswerItemHtml(answer, index))
            .join('');

        return `
        <form>
            <legend class="question-text">${question.text}</legend>
            </br>
              ${answers}
            </br>
            </br>
            <button class ="inputSubmit" type="submit">Submit</button>
        </form>
      `;
    }

    generateFeedbackHtml(feedback) {
        return `
        <p>
          ${feedback}
        </p>
        <button class="continue js-continue">Continue</button>
      `;
    }
}

const quiz = new API();
const newStore = new Store();
const questionList = new buildQuestion();
const newGenerator = new Generator();
const newRender = new quizRender();

// On DOM Ready, run render() and add event listeners
$(() => {
    // Run first render
    newRender.render();

    // Fetch session token, re-render when complete
    quiz._fetchToken(() => {
        newRender.render();
    });

    $('.js-intro, .js-outro').on('click', '.js-start', newRender.handleStartQuiz);
    $('.js-question').on('submit', newRender.handleSubmitAnswer);
    $('.js-question-feedback').on('click', '.js-continue', newRender.handleNextQuestion);
    $('.js-restart').on('click', newRender.handleRestartQuiz);
});