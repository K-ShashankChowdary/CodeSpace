#include <vector>
#include <iostream>
int main(){
    std::vector<int> v(100000000, 42);
    std::cout << v[99999999]; // Force the compiler to actually keep the vector
    return 0;
}