(function() {
	const e = {
		cosineSimilarity(e, t) {
			if (e.length !== t.length) return 0;
			let s = 0, r = 0, a = 0;
			for (let n = 0; n < e.length; n++) s += e[n] * t[n], r += e[n] * e[n], a += t[n] * t[n];
			const i = Math.sqrt(r) * Math.sqrt(a);
			return 0 === i ? 0 : s / i;
		},
		calculateCentroid(e) {
			if (0 === e.length) return new Float32Array(0);
			const t = e[0].length, s = new Float32Array(t);
			for (const r of e) for (let e = 0; e < t; e++) s[e] += r[e];
			for (let r = 0; r < t; r++) s[r] /= e.length;
			return s;
		},
		findBestMatches(e, t, s, r) {
			return t.map((t) => ({
				ep: t,
				sim: this.cosineSimilarity(e, t.narrativeVector)
			})).filter((e) => e.sim >= r).sort((e, t) => t.sim - e.sim).slice(0, s);
		}
	};
	self.onmessage = (t) => {
		const { type: s, payload: r, id: a } = t.data;
		try {
			let t;
			switch (s) {
				case "SIMILARITY":
					t = e.cosineSimilarity(r.vecA, r.vecB);
					break;
				case "CENTROID":
					t = e.calculateCentroid(r.vectors);
					break;
				case "SEARCH":
					t = e.findBestMatches(r.queryVector, r.episodes, r.limit, r.threshold);
					break;
				default: throw new Error(`Unknown task type: ${s}`);
			}
			self.postMessage({
				id: a,
				result: t,
				success: !0
			});
		} catch (i) {
			self.postMessage({
				id: a,
				error: i.message,
				success: !1
			});
		}
	};
})();
