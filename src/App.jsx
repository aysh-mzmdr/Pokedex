import { useState, useEffect } from "react";
import styles from "./App.module.css"

const App = () => {

  const firstCharFixer = (text) => {
    const firstChar=text.charAt(0).toUpperCase();
        let name=firstChar;
        for(let i=1;i<text.length;i++){
            name=name+""+text.charAt(i);
        }
    return name;
  }

  const [bodyHidden,setBodyHidden]=useState(true);
  const [search,setSearch]=useState("")
  const [pokeData,setPokeData]=useState("")
  const [pokeFact,setPokeFact]=useState("")

  const fetchData = async() => {
    try{
        setBodyHidden(false);
        const searchData=search.toLowerCase()
        setSearch(searchData)
        const response1=await fetch(`https://pokeapi.co/api/v2/pokemon/${search}`);
        if(!response1.ok){
            throw new Error("Pokemon not found!!");
        }

        const data1=await response1.json()
        setPokeData(data1);

        const response2=await fetch(`https://pokeapi.co/api/v2/pokemon-species/${data1.id}/`);
        const data2=await response2.json();
        setPokeFact(data2);
    }
    catch(error){
        setBodyHidden(true);
        console.error(error);
    }

  }

  return(
      <div className={styles.container}>
        <div className={styles.inputArea}>
            <input type="text" className={styles.searchInput} onChange={(e) => setSearch(e.target.value)} placeholder="Enter the Pokemon name or id"/>
            <button className={styles.searchButton} onClick={fetchData}>Search</button>
        </div>
        {pokeData && <div className={styles.pokeDex} hidden={bodyHidden}>
            <div className={styles.pokeCard}>
                <h1 className={styles.name}>{firstCharFixer(pokeData.name)}</h1>
                <h3 className={styles.id}>{pokeData.id}</h3>
                <img className={styles.sprite} src={pokeData.sprites.front_default} alt="sprite"/>
                <div className={styles.type}>
                    <button className={styles.typeBadge1}>{firstCharFixer(pokeData.types[0].type.name)}</button>
                    {pokeData.types[1] && <button className={styles.typeBadge2}>{firstCharFixer(pokeData.types[1].type.name)}</button>}
                </div>
                <div className={styles.ability}>
                    <h3 className={styles.abilityText}>Abilty: {firstCharFixer(pokeData.abilities[0].ability.name)}</h3>
                    {pokeData.abilities[1] && <h3 className={styles.abilityTextHidden}>Hidden Ability: {firstCharFixer(pokeData.abilities[1].ability.name)}</h3>}
                    </div>
                {pokeFact && <h4 className={styles.fact}>{pokeFact.flavor_text_entries[0].flavor_text}</h4>}
                <h3 className={styles.source}>Source:https://pokeapi.co/</h3>
            </div>
        </div>}
    </div>
  )
}

export default App;