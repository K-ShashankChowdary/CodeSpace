#include <bits/stdc++.h>
using namespace std;
// 0
#define int long long int
#define pb push_back
#define vi vector<int>
#define all(x) (x).begin(), (x).end()
#define rall(x) (x).rbegin(), (x).rend()
#define minel(x) *min_element(all(x))
#define maxel(x) *max_element(rall(x))
#define bins(n, x) (x <= 64 ? bitset<64>(n).to_string().substr(64 - x) : string(x, '0'))
const int M = 1e9 + 7;
int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }
int lcm(int a, int b) { return (a * b) / gcd(a, b); }

// tc->O(NlogN+N)
// sc->O(N)
void solve()
{
    int n, p;
    cin >> n >> p;
    vector<int> a(n), b(n);
    for (int i = 0; i < n; i++)
    {
        cin >> a[i];
    }

    for (int i = 0; i < n; i++)
    {
        cin >> b[i];
    }

    vector<pair<int, int>> c(n);
    for (int i = 0; i < n; i++)
    {
        c[i] = {b[i], a[i]};
    }

    sort(c.begin(), c.end());

    int ans = p;
    n = n - 1;
    int i = 0;
    while (n)
    {
        int cost = c[i].first;
        int people = c[i].second;
        if (cost > p)
        {
            ans += (n * p); // if its better for chenak to say directly
            break;
        }
        int npeople = min(people, n); // number of people to say this msg too
        ans += (npeople * cost);
        n -= npeople; // no of people who didnt get the msg;
        i++;
    }
    cout << ans << endl;
}

int32_t main()
{
    auto begin = std::chrono::high_resolution_clock::now();
    ios_base::sync_with_stdio(0);
    cin.tie(0);
    int T = 1;
    cin >> T;
    for (int i = 1; i <= T; i++)
    {
        // cout << "Case #" << i << ": ";
        solve();
    }
    auto end = std::chrono::high_resolution_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::nanoseconds>(end - begin);
    cerr << "Time measured: " << elapsed.count() * 1e-6 << " milliseconds\n";

    return 0;
}