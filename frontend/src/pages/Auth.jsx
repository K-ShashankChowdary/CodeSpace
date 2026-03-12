import Toast from "../components/ui/Toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast(null);
    setIsLoading(true);

    try {
      const endpoint = isLogin ? "/users/login" : "/users/register";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      await api.post(endpoint, payload);

      if (isLogin) {
        showToast("Logged in successfully!", "success");
        setTimeout(() => {
          window.location.href = "/"; // hard reload to trigger fresh auth check in App.jsx
        }, 1000);
      } else {
        showToast("Account created! Please log in.", "success");
        setIsLogin(true);
        setFormData({ username: "", email: "", password: "" });
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Authentication failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center text-gray-200 font-sans p-4 relative">
      <div className="bg-[#121212] p-8 rounded-xl border border-[#2a2a2a] w-full max-w-md shadow-2xl transition-all duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">CodeSpace</h1>
          <h2 className="text-sm font-medium text-gray-400">
            {isLogin ? "Welcome back. Log in to continue." : "Create your account to get started."}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <Input
              label="Username"
              type="text"
              name="username"
              placeholder="johndoe"
              value={formData.username}
              onChange={handleChange}
              required={!isLogin}
            />
          )}
          <Input
            label="Email Address"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isLoading}
            className="w-full mt-4"
          >
            {isLoading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            className="text-blue-500 font-semibold hover:text-blue-400 transition-colors focus:outline-none"
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </div>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default Auth;
