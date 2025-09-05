import { NavLink } from 'react-router';

export function AppNav() {
  return (
    <nav>
      <NavLink to="/" end>
        Home
      </NavLink>
      <NavLink to="/about" end>
        About
      </NavLink>
      <NavLink to="/recipes" end>
        Recipes
      </NavLink>

      <NavLink to="/recipes/recipe1" end>
        Recipe 1
      </NavLink>
    </nav>
  );
}
