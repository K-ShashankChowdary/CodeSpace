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

// tc->O()
// sc->O()
void solve()
{
    int n, k;
    cin >> n >> k;
    int low = 0, high = n;
    while (low <= high)
    {
        int mid = low + (high - low) / 2;
        int nmes = (mid * (mid + 1)) / 2;
        if (nmes <= k)
        {
            low = mid + 1;
        }
        else
        {
            high = mid - 1;
        }
    }
    cout << high << " ";
    int val = high;
    int nmes = (high * (high + 1)) / 2;
    k = k - nmes;
    cout << k << " ";
    low = 0, high = n;
    // if (val == n)
    //     high = n - 1;
    while (low <= high)
    {
        int mid = low + (high - low) / 2;
        int nmes = ((high * (high + 1)) / 2) - ((mid * (mid + 1)) / 2);
        if (nmes <= k)
        {
            low = mid + 1;
        }
        else
        {
            high = mid - 1;
        }
    }
    cout << high << " ";
    cout << high + val << endl;
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