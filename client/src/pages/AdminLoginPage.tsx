import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AdminLoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md bg-white shadow-xl border border-gold/20 rounded-lg p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-8">
          <Heart className="w-12 h-12 mx-auto text-gold mb-4" fill="#c9a961" />
          <h1 className="font-script text-4xl text-charcoal">Admin</h1>
          <p className="font-cormorant text-charcoal/60 mt-2">
            {isSignUp ? 'Create an account' : 'Sign in to manage your weddings'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-charcoal/20 bg-transparent font-cormorant"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 pr-12 border border-charcoal/20 bg-transparent font-cormorant"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/50"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm font-montserrat">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 btn-gold text-white font-montserrat text-sm tracking-widest uppercase disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <Link
          to="/"
          className="block mt-6 text-center font-montserrat text-xs text-charcoal/50 uppercase tracking-wider hover:text-gold"
        >
          ← Back to weddings
        </Link>
      </motion.div>
    </div>
  );
}
