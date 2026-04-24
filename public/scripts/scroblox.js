import axios from 'axios';

const API_URL = "https://api.eberardos.my.id/search/roblox-script";

function cleanTitle(title) {
	if (!title) return "Script Tanpa Judul";

	let cleaned = title.replace(/[\n\t]/g, ' ').trim().replace(/\s+/g, ' ');

	const unnecessary = ['WORKING', 'FREE'];
	unnecessary.forEach(word => {
		const regex = new RegExp(`(\\s*\\W*)${word}(\\s*\\W*)`, 'gi');
		cleaned = cleaned.replace(regex, ' ');
	});

	cleaned = cleaned.replace(/[\[\]\(\)\{\}\<\>]/g, ' ');
	cleaned = cleaned.replace(/['"]/g, '');
	cleaned = cleaned.replace(/\s+/g, ' ').trim();

	return cleaned.substring(0, 70);
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
	const cmd = usedPrefix + command;
	const args = text.trim().split(' ');
	const type = args[0];

	if (type === 'get') {
		const loadstring = text.slice(4);
		if (!loadstring) return m.reply('❌ Loadstring tidak valid.');
		return m.reply(loadstring);
	}

	const query = text.trim();

	if (!query) {
		return m.reply(`*ROBLOX SCRIPT FINDER*\n\n*Usage:* ${cmd} <game_name>\n\nContoh:\n${cmd} blox fruit`);
	}

	try {
		await m.reply('⏳ Sedang mencari script Roblox...');

		const response = await axios.get(API_URL, {
			params: { q: query },
			timeout: 20000
		});

		const { status, total, result, message } = response.data || {};

		if (!status || !result || result.length === 0) {
			return m.reply(message || `❌ Tidak ditemukan Loadstring untuk *${query}*.`);
		}

		let rows = result.map((script, index) => ({
			title: `#${index + 1} ${cleanTitle(script.originalTitle || script.title)}`,
			description: 'Ambil loadstring',
			id: `${cmd} get ${script.loadstring}`
		}));

		return conn.sendButton(
			m.chat,
			{
				text: `Ditemukan *${total || result.length}* sc roblox untuk: *${query}*`,
				title: 'ROBLOX SCRIPT',
				footer: 'Pilih script di bawah',
				buttons: [
					{
						name: 'single_select',
						buttonParamsJson: JSON.stringify({
							title: '📜 Pilih Script',
							sections: [{ title: 'Hasil', rows }],
						}),
					},
				],
			},
			{ quoted: m }
		);

	} catch (err) {
		console.error("[ROBLOX SCRIPT API ERROR]:", err);

		let errorMessage = "⚠️ Terjadi kesalahan saat mencari script Roblox.";

		if (err.response) {
			errorMessage = `❌ API Error: Status Code ${err.response.status}.`;
		} else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
			errorMessage = '❌ Permintaan ke API Timeout. Coba ulangi perintah.';
		} else if (err.code === 'ENOTFOUND') {
			errorMessage = '❌ API server tidak ditemukan. Coba lagi nanti.';
		}

		await m.reply(errorMessage);
	}
};

handler.help = ['scroblox <map>'];
handler.tags = ['search'];
handler.command = ['scr', 'scroblox'];

export default handler;