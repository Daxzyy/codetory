const axios = require("axios")

// IF USED ESM
// import axios from 'axios';

const mcpedl = {
  /**
   * @async
   * @function getHeaders
   * @returns {<Object>} Response object containing headers APIs
  **/
  getHeaders: () => {
    return {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Content-Type": "application/json; charset=UTF-8",
      "Origin": 'https://mcpedl.com',
      "Referer": 'https://mcpedl.com/',
      "User-Agent": "Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36",
    }
  },

  /**
   * @property {string[]} category - Available content categories
  **/
  category: ['any', 'addons', 'maps', 'texture-packs', 'servers', 'scripts'],

  /**
   * @property {string[]} sorts - Available sorting options
  **/
  sorts: ['latest', 'popular-week', 'popular-month', 'popular'],

  /**
   * @async
   * @function submission
   * @param {Object} params - URL parameters for the submission request
   * @returns {Promise<Object>} Response object containing status and data
   * @throws {Error} When params is not an object
  **/
  submission: async(params) => {
    try {
      // if (typeof params !== 'object') return new Error("not found data")
      let st = new URLSearchParams(params).toString()
      let res = await axios.get('https://api.mcpedl.com/api/submissions?'+st, {
        headers: mcpedl.getHeaders()
      })
      let se = await res.data
      return { status: true, data: se?.data, code: 200 }
    } catch(e) {
      return { status: false, mess: 'terjadi eror', log: e.message, code: e.code, params: new URLSearchParams(params).toString() }
    }
  },
  
  request: async(params, info = false) => {
    try {
      let st = 0;
      let trying = 5;

      while (true) {
        if (st > trying) return { status: false, mess: 'terlalu banyak percobaan', };
        st += 1;
        try {
          const req = (info === false) ? await mcpedl.submission(params) : await mcpedl.info2(params);
          if (req.status == false) continue;
          return req
        } catch(e) {
          throw e
        }
      }
    } catch(e) {
      return { status: false, mess: 'terjadi eror', log: e.message }
    }
  },
  
  /**
   * @async
   * @function info
   * @param {string} params - Slug or identifier for the content
   * @returns {Promise<Object>} Response object containing status and content data
  **/
  info2: async(params) => {
    try {
      let res = await axios.get('https://api.mcpedl.com/api/route/slug/' + params.toLowerCase().replace('https://mcpedl.com/','').trim(), {
        headers: mcpedl.getHeaders()
      })
      return { status: true, data: res.data?.data, code: 200 }
    } catch(e) {
      return { status: false, mess: 'Terjadi eror', log: e.message, code: e.status }
    }
  },
  
  info: async(params) => {
    try {
      let res = await mcpedl.request(params, true)
      return { status: true, data: res.data, code: 200 }
    } catch(e) {
      return { status: false, mess: 'Terjadi eror', log: e.message, code: e.status }
    }
  },
  
  /**
   * @async
   * @function search
   * @param {Object} params - Search parameters
   * @param {number} [params.per_page=10] - Number of items per page
   * @param {number} [params.page=1] - Page number
   * @param {string} [params.category='any'] - Content category
   * @param {string} [params.sort='latest'] - Sort order
   * @param {string} [params.query] - Search query [OPTIONAL]
   * @returns {Promise<Object>} Response object containing search results
  **/
  search: async(params = {}) => {
    try {
      const {
        per_page = 10,
        page = 1,
        category = 'any',
        sort = 'latest'
      } = params;

      if (params.category && !mcpedl.categori.includes(params.category)) return { status: false, mess: \`Harap masukkan kategori yang sesuai\`, category: mcpedl.category };
      if (params.sort && !mcpedl.sorts.includes(params.sort)) return { status: false, mess: \`Harap masukkan urutan yang sesuai\`, sort: mcpedl.sorts };

      let f1 = {
        ...(params.category ? { slug: params.category } : { slug: category }),
        ...(params.sort ? { sort: params.sort } : { sort: sort })
      };

      if (params.query) {
        f1 = {
          is_actual_version: '1',
          s: params.query,
        };
      };
      
      const res = await mcpedl.request({
        per_page: params.per_page ? params.per_page : per_page,
        page: params.page ? params.page : page,
        ...f1
      })
      return res
    } catch(e) {
      return { status: false, mess: 'Terjadi eror', log: e.message }
    }
  },
  
  /**
   * @async
   * @function user
   * @param {Object} params - User search parameters
   * @param {number} [params.per_page=10] - Number of items per page
   * @param {number} [params.page=1] - Page number
   * @param {string} [params.sort='latest'] - Sort order
   * @param {string} [params.username] - Username to search for [REQUIRED]
   * @returns {Promise<Object>} Response object containing user data and their submissions
  **/
  user: async(params = {}) => {
    try {
      const {
        per_page = 10,
        page = 1,
        sort = 'latest'
      } = params;

      if (params.sort && !mcpedl.sorts.includes(params.sort)) return { status: false, mess: \`Harap masukkan urutan yang sesuai\`, sort: mcpedl.sorts };

      let f1 = {
        ...(params.sort ? { sort: params.sort } : { sort: sort })
      };
      
      if (params.username) {
        f1 = {
          user_nickname: params.username.trim(),
          include_skins: '1'
        };
      } else {
        return { status: false, mess: 'Harap masukkan object username nya' }
      }
      
      let ty = await axios.get('https://api.mcpedl.com/api/user/' + params.username.trim(), {
        headers: mcpedl.getHeaders()
      })
      
      const res = await mcpedl.request({
        per_page: params.per_page ? params.per_page : per_page,
        page: params.page ? params.page : page,
        ...f1
      })
      return { status: true, user: ty.data.data, data: res.data, code: 200 }
    } catch(e) {
      return { status: false, mess: 'Terjadi eror', log: e.message, code: e.status }
    }
  }
};

module.exports = mcpedl

// IF USED ESM
// export default mcpedl