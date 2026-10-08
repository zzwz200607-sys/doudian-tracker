const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/zzwz200607-sys/doudian-tracker/main/data.json';

function calcConversion(visitors, orders) {
    if (!visitors || visitors === 0) return 0;
    return (orders / visitors * 100).toFixed(2);
}

function getChange(current, previous) {
    if (!previous || previous === 0) return { text: '-', cls: 'flat' };
    const diff = current - previous;
    const pct = (diff / previous * 100).toFixed(1);
    if (diff > 0) return { text: '↑ ' + pct + '%', cls: 'up' };
    if (diff < 0) return { text: '↓ ' + pct + '%', cls: 'down' };
    return { text: '→', cls: 'flat' };
}

async function loadData() {
    document.getElementById('syncInfo').textContent = '正在从 GitHub 加载...';

    try {
        var response = await fetch(GITHUB_RAW_URL + '?t=' + Date.now(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        var data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            document.getElementById('syncInfo').textContent = '暂无数据，请先在电脑端抓取';
            document.getElementById('noData').style.display = 'block';
            return;
        }

        renderStats(data);
        renderHistory(data);
        renderChart(data);

        var today = data[data.length - 1];
        if (today.captureTime) {
            document.getElementById('syncInfo').textContent =
                '最后更新：' + new Date(today.captureTime).toLocaleString('zh-CN');
        } else {
            document.getElementById('syncInfo').textContent = '数据日期：' + today.date;
        }

    } catch(err) {
        document.getElementById('syncInfo').textContent = '加载失败：' + err.message;
    }
}

function renderStats(data) {
    var today = data[data.length - 1];
    var yesterday = data.length >= 2 ? data[data.length - 2] : null;

    document.getElementById('visitors').textContent = today.visitors || '-';
    document.getElementById('exposure').textContent = today.exposure || '-';
    document.getElementById('orders').textContent = today.orders || '-';
    document.getElementById('revenue').textContent = '¥' + (today.revenue || 0).toFixed(2);
    document.getElementById('conversion').textContent = (today.conversion || calcConversion(today.visitors, today.orders)) + '%';
    document.getElementById('score').textContent = today.score || '-';

    var ids = ['visitors','exposure','orders','revenue','score'];
    var keys = ['visitors','exposure','orders','revenue','score'];
    ids.forEach(function(id, i) {
        var ch = getChange(today[keys[i]], yesterday ? yesterday[keys[i]] : 0);
        document.getElementById(id + 'Change').textContent = ch.text;
        document.getElementById(id + 'Change').className = 'change ' + ch.cls;
    });

    var todayConv = parseFloat(today.conversion || calcConversion(today.visitors, today.orders));
    var yConv = yesterday ? parseFloat(yesterday.conversion || calcConversion(yesterday.visitors, yesterday.orders)) : 0;
    var cCh = getChange(todayConv, yConv);
    document.getElementById('conversionChange').textContent = cCh.text;
    document.getElementById('conversionChange').className = 'change ' + cCh.cls;

    if (today.productStats && today.productStats.length > 0) {
        document.getElementById('productCard').style.display = 'block';
        var tbody = document.getElementById('productBody');
        tbody.innerHTML = '';
        today.productStats.forEach(function(p) {
            var tr = document.createElement('tr');
            tr.innerHTML = '<td style="text-align:left;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + p.name + '</td><td>' + p.exposure + '</td><td>' + p.orders + '</td><td>¥' + (p.revenue || 0).toFixed(2) + '</td>';
            tbody.appendChild(tr);
        });
    }
}

function renderHistory(data) {
    var tbody = document.getElementById('historyBody');
    var noData = document.getElementById('noData');
    tbody.innerHTML = '';
    if (data.length === 0) { noData.style.display = 'block'; return; }
    noData.style.display = 'none';
    var sorted = data.slice().reverse().slice(0, 14);
    sorted.forEach(function(row) {
        var conv = row.conversion || calcConversion(row.visitors, row.orders);
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + row.date + '</td><td>' + row.visitors + '</td><td>' + row.orders + '</td><td>¥' + (row.revenue || 0).toFixed(2) + '</td><td>' + conv + '%</td>';
        tbody.appendChild(tr);
    });
}

var trendChart = null;
function renderChart(data) {
    var canvas = document.getElementById('trendChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var last7 = data.slice(-7);
    if (trendChart) trendChart.destroy();
    if (last7.length === 0) return;
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7.map(function(r) { return r.date.slice(5); }),
            datasets: [
                { label: '访客', data: last7.map(function(r) { return r.visitors; }), borderColor: '#e83e8c', backgroundColor: 'rgba(232,62,140,0.1)', tension: 0.3, fill: true },
                { label: '曝光', data: last7.map(function(r) { return r.exposure; }), borderColor: '#6c5ce7', backgroundColor: 'rgba(108,92,231,0.1)', tension: 0.3, fill: true },
                { label: '订单', data: last7.map(function(r) { return r.orders; }), borderColor: '#00b894', backgroundColor: 'rgba(0,184,148,0.1)', tension: 0.3, fill: true }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
    });
}

window.onload = function() {
    loadData();
    var btn = document.getElementById('btnRefresh');
    if (btn) btn.addEventListener('click', loadData);
    setInterval(loadData, 60000);
};
