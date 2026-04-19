const axios = require('axios');

class NekoPoi {
    constructor() {
        this.client = axios.create({
            baseURL: 'https://api.explorethefrontierforlimitlessimaginationanddiscov.com/330cceade91a6a9cd30fb8042222ed56/71b8acf33b508c7543592acd9d9eb70d',
            headers: {
                token: 'XbGSFkQsJYbFC6pcUMCFL4oNHULvHU7WdDAXYgpmqYlh7p5ZCQ4QZ13GDgowiOGvAejz9X5H6DYvEQBMrc3A17SO3qwLwVkbn6YY',
                accept: 'application/json',
                appbuildcode: '25301',
                appsignature: 'pOplm8IDEDGXN55IaYohQ8CzJFvWsfXyhGvwPRD9kWgzYSRuuvAOPfsE0AJbHVbAJyWGsGCNUIuQLJ7HbMbuFLMWwDgHNwxOrYMH',
                'accept-encoding': 'gzip',
                'user-agent': 'okhttp/4.10.0',
                'if-modified-since': 'Fri, 20 Jun 2025 07:10:42 GMT'
            }
        });
        
        this.letters = ['0-9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
        this.types = ['hentai', '2d_animation', '3d_hentai', 'jav', 'jav_cosplay'];
        this.genres = ['action', 'ahegao', 'anal', 'armpit', 'bdsm', 'big_oppai', 'blackmail', 'blonde', 'blowjob', 'bondage', 'comedy', 'creampie', 'dark_skin', 'dilf', 'elf', 'exhibitionist', 'fellatio', 'female_monster', 'femdom', 'footjob', 'forced', 'furry', 'futanari', 'gangbang', 'gore', 'handjob', 'harem', 'horror', 'housewife', 'humilation', 'humiliation', 'hypnotize', 'incest', 'intercrural', 'jav', 'lactation', 'loli', 'maid', 'male_monster', 'masturbation', 'megane', 'milf', 'mind_control', 'monster', 'netorare', 'nurse', 'old_man', 'onee_san', 'oral', 'paizuri', 'pantyhose', 'pregnant', 'prostitution', 'rape', 'romance', 'saimin', 'schoolgirl', 'semi_hentai', 'sex_toys', 'shibari', 'shota', 'stocking', 'succubus', 'supranatural', 'swimsuit', 'tentacles', 'threesome', 'tsundere', 'ugly_bastard', 'uncensored', 'vanilla', 'virgin', 'yaoi', 'yuri'];
    }
    
    async fetch(url) {
        const { data } = await this.client(url).catch(e => { throw new Error(e.message); });
        return data;
    }
    
    validate(val, list, label) {
        if (list && !list.includes(val)) throw new Error(`List available ${label}: ${list.join(', ')}.`);
        if (!list && isNaN(val)) throw new Error('Invalid page input.');
    }
    
    async latest() {
        return this.fetch('/recent');
    }
    
    async indeks(letter, type, page = '1') {
        this.validate(letter, this.letters, 'letters');
        this.validate(type, this.types, 'types');
        this.validate(page);
        
        return this.fetch(`/listall?letter=${letter}&type=${type}&page=${page}`);
    }
    
    async genre(genre) {
        this.validate(genre, this.genres, 'genres');
        
        return this.fetch(`/searchByGenre?term=${this.genres.indexOf(genre)}`);
    }
    
    async search(query, page = '1') {
        if (!query) throw new Error('Query is required.');
        this.validate(page);
        
        return this.fetch(`/search?q=${query}&page=${page}`);
    }
    
    async detail(id) {
        if (!id || isNaN(id)) throw new Error('ID is required.');
        
        return this.fetch(`/post?id=${id}`);
    }
   
   
    async series(id) {
        if (!id || isNaN(id)) throw new Error('ID is required.');
        
        return this.fetch(`/series?id=${id}`);
    }
}

// Usage:
const neko = new NekoPoi();
neko.search('shoujo ramune').then(console.log);
